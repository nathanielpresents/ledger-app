import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import JournalActions from "./journal-actions";

export default async function JournalDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const journal = await prisma.journal.findUnique({
    where: { id: params.id },
    include: {
      lines: true,
      createdBy: true,
      approvedBy: true,
      reversesJournal: true,
      reversedBy: true,
      auditLogs: { orderBy: { createdAt: "asc" }, include: { performedBy: true } },
    },
  });
  if (!journal) notFound();

  const totalDebit = journal.lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredit = journal.lines.reduce((s, l) => s + Number(l.credit), 0);

  return (
    <div className="container">
      <div className="topbar">
        <h2 style={{ margin: 0 }}>
          Journal {journal.reference || journal.id} <span className={`badge ${journal.status}`}>{journal.status}</span>
        </h2>
      </div>

      <div className="card">
        <p>
          <strong>Description:</strong> {journal.description || "—"}
        </p>
        <p>
          <strong>Effective date:</strong> {new Date(journal.effectiveDate).toLocaleDateString()}
        </p>
        <p>
          <strong>Created by:</strong> {journal.createdBy.name}
          {journal.approvedBy && (
            <>
              {" "}
              · <strong>Approved by:</strong> {journal.approvedBy.name}
            </>
          )}
        </p>
        {journal.reversesJournal && <p className="muted">This journal reverses {journal.reversesJournal.id}.</p>}
        {journal.reversedBy && <p className="muted">This journal was reversed by {journal.reversedBy.id}.</p>}

        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Account</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {journal.lines.map((l) => (
              <tr key={l.id}>
                <td>
                  {l.accountCode} {l.accountDesc ? `— ${l.accountDesc}` : ""}
                </td>
                <td>{l.description}</td>
                <td>{Number(l.debit) ? Number(l.debit).toFixed(2) : ""}</td>
                <td>{Number(l.credit) ? Number(l.credit).toFixed(2) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2}>
                <strong>Totals</strong>
              </td>
              <td>
                <strong>{totalDebit.toFixed(2)}</strong>
              </td>
              <td>
                <strong>{totalCredit.toFixed(2)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h3>Actions</h3>
        <p className="muted">
          Buttons shown below are a convenience only. The server independently re-checks your role and the
          journal's current state before doing anything — this is the fix for the old system, where hiding a
          button in the browser was the only protection.
        </p>
        <JournalActions
          journalId={journal.id}
          status={journal.status}
          createdById={journal.createdById}
          userId={session!.user.id}
          userRole={session!.user.role}
          alreadyReversed={!!journal.reversedBy}
        />
      </div>

      <div className="card">
        <h3>Audit trail</h3>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>By</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {journal.auditLogs.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString()}</td>
                <td>{a.action}</td>
                <td>{a.performedBy.name}</td>
                <td>{a.remark || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
