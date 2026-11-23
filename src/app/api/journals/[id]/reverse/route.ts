import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canReverse } from "@/lib/rbac";
import { loadJournal } from "@/lib/journalActions";
import { handleApiError } from "@/lib/apiError";
import { ForbiddenError } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { remarkSchema } from "@/lib/validation";

// Reversing never edits or deletes the original posted journal -- that
// would destroy history. It creates a brand new journal with debit/credit
// swapped on every line, linked back to the original, and leaves a full
// audit trail on both records. This is the accounting-correct way to undo
// a posted entry, unlike a silent in-place "Reverse" link.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = remarkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const original = await loadJournal(params.id);
    if (!original) return NextResponse.json({ error: "Journal not found" }, { status: 404 });
    if (!canReverse(session.user.role, original)) {
      throw new ForbiddenError("This journal cannot be reversed (wrong state, already reversed, or insufficient role).");
    }

    const reversal = await prisma.$transaction(async (tx) => {
      const newJournal = await tx.journal.create({
        data: {
          reference: original.reference ? `REV-${original.reference}` : `REV-${original.id}`,
          description: `Reversal of journal ${original.id}${parsed.data.remark ? `: ${parsed.data.remark}` : ""}`,
          effectiveDate: new Date(),
          status: "POSTED",
          createdById: session.user.id,
          approvedById: session.user.id,
          reversesJournalId: original.id,
          lines: {
            create: original.lines.map((l) => ({
              accountCode: l.accountCode,
              accountDesc: l.accountDesc,
              // swapped on purpose
              debit: l.credit,
              credit: l.debit,
              description: l.description,
            })),
          },
        },
      });

      await tx.auditLog.create({
        data: {
          journalId: original.id,
          action: "REVERSED",
          performedById: session.user.id,
          remark: parsed.data.remark,
        },
      });
      await tx.auditLog.create({
        data: {
          journalId: newJournal.id,
          action: "CREATED_AS_REVERSAL",
          performedById: session.user.id,
        },
      });

      return newJournal;
    });

    return NextResponse.json(reversal, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
