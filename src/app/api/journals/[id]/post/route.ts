import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canPost } from "@/lib/rbac";
import { transitionJournal } from "@/lib/journalActions";
import { handleApiError } from "@/lib/apiError";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await transitionJournal({
      journalId: params.id,
      performedById: session.user.id,
      action: "POSTED",
      newStatus: "POSTED",
      check: (journal) => canPost(session.user.role, journal),
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
