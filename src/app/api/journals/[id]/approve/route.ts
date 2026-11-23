import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canApproveOrReject } from "@/lib/rbac";
import { transitionJournal } from "@/lib/journalActions";
import { handleApiError } from "@/lib/apiError";
import { remarkSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = remarkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    // canApproveOrReject rejects the request server-side if
    // journal.createdById === session.user.id, even if the UI button to
    // approve were somehow shown or forged. This is the maker-checker rule
    // the old system never enforced outside the browser.
    const result = await transitionJournal({
      journalId: params.id,
      performedById: session.user.id,
      action: "APPROVED",
      remark: parsed.data.remark,
      newStatus: "APPROVED",
      check: (journal) => canApproveOrReject(session.user.role, session.user.id, journal),
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
