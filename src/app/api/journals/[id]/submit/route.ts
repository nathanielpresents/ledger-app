import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canSubmitJournal } from "@/lib/rbac";
import { transitionJournal } from "@/lib/journalActions";
import { handleApiError } from "@/lib/apiError";

// POST only -- intentionally there is no GET handler here, so a bare link
// like the old /Finance/GlRecordJournal/Reverse/123 simply cannot trigger
// this. A cross-site <img> or <a> tag can only issue a GET request.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const result = await transitionJournal({
      journalId: params.id,
      performedById: session.user.id,
      action: "SUBMITTED",
      newStatus: "SUBMITTED",
      check: (journal) => canSubmitJournal(session.user.role, session.user.id, journal),
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
