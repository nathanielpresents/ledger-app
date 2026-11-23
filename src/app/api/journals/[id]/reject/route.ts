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
  if (!parsed.data.remark) {
    return NextResponse.json({ error: "A remark explaining the rejection is required." }, { status: 400 });
  }

  try {
    const result = await transitionJournal({
      journalId: params.id,
      performedById: session.user.id,
      action: "REJECTED",
      remark: parsed.data.remark,
      newStatus: "REJECTED",
      check: (journal) => canApproveOrReject(session.user.role, session.user.id, journal),
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
