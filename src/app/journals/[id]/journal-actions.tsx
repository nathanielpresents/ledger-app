"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  journalId: string;
  status: string;
  createdById: string;
  userId: string;
  userRole: string;
  alreadyReversed: boolean;
};

export default function JournalActions({ journalId, status, createdById, userId, userRole, alreadyReversed }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(action: string, remark?: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/journals/${journalId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remark }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "The server rejected this action.");
      return;
    }
    router.refresh();
  }

  // These checks only decide which buttons to SHOW. The real decision
  // happens again on the server for every click -- see the comment on the
  // page above.
  const isCreator = createdById === userId;
  const canSubmit = status === "DRAFT" && isCreator;
  const canApproveOrReject = status === "SUBMITTED" && !isCreator && (userRole === "APPROVER" || userRole === "ADMIN");
  const canPost = status === "APPROVED" && (userRole === "APPROVER" || userRole === "ADMIN");
  const canReverse = status === "POSTED" && !alreadyReversed && (userRole === "APPROVER" || userRole === "ADMIN");

  if (!canSubmit && !canApproveOrReject && !canPost && !canReverse) {
    return <p className="muted">No actions available to you for this journal right now.</p>;
  }

  return (
    <div>
      {error && <p className="error">{error}</p>}
      {canSubmit && (
        <button className="btn" disabled={busy} onClick={() => call("submit")}>
          Submit for approval
        </button>
      )}
      {canApproveOrReject && (
        <>
          <button className="btn" disabled={busy} onClick={() => call("approve")} style={{ marginRight: 8 }}>
            Approve
          </button>
          <button
            className="btn danger"
            disabled={busy}
            onClick={() => {
              const remark = window.prompt("Reason for rejection (required):");
              if (remark) call("reject", remark);
            }}
          >
            Reject
          </button>
        </>
      )}
      {canPost && (
        <button className="btn" disabled={busy} onClick={() => call("post")}>
          Post to ledger
        </button>
      )}
      {canReverse && (
        <button
          className="btn danger"
          disabled={busy}
          onClick={() => {
            const remark = window.prompt("Reason for reversal (optional):") || undefined;
            call("reverse", remark);
          }}
        >
          Reverse
        </button>
      )}
    </div>
  );
}
