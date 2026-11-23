import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createJournalSchema } from "@/lib/validation";
import { canCreateJournal } from "@/lib/rbac";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Every authenticated role may at least view journals; write actions are
  // gated separately below and in the per-action routes.
  const journals = await prisma.journal.findMany({
    include: { lines: true, createdBy: true, approvedBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(journals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!canCreateJournal(session.user.role)) {
    return NextResponse.json({ error: "Your role cannot create journals." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createJournalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const journal = await prisma.$transaction(async (tx) => {
    const j = await tx.journal.create({
      data: {
        reference: data.reference,
        description: data.description,
        effectiveDate: data.effectiveDate,
        createdById: session.user.id,
        status: "DRAFT",
        lines: {
          create: data.lines.map((l) => ({
            accountCode: l.accountCode,
            accountDesc: l.accountDesc,
            debit: l.debit,
            credit: l.credit,
            description: l.description,
          })),
        },
      },
    });
    await tx.auditLog.create({
      data: {
        journalId: j.id,
        action: "CREATED",
        performedById: session.user.id,
      },
    });
    return j;
  });

  return NextResponse.json(journal, { status: 201 });
}
