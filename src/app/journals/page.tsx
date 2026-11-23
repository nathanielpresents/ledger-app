import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import SignOutButton from "./sign-out-button";

export default async function JournalsPage() {
  const session = await getServerSession(authOptions);
  const journals = await prisma.journal.findMany({
    include: { lines: true, createdBy: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h2 style={{ margin: 0 }}>Journals</h2>
          <p className="muted" style={{ margin: 0 }}>
            Signed in as {session?.user?.name} ({session?.user?.role})
          </p>
        </div>
        <div>
          <Link className="btn" href="/journals/new">
            + New journal
          </Link>{" "}
          <SignOutButton />
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Description</th>
              <th>Effective date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Created by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {journals.map((j) => {
              const total = j.lines.reduce((sum, l) => sum + Number(l.debit), 0);
              return (
                <tr key={j.id}>
                  <td>{j.reference || "—"}</td>
                  <td>{j.description || "—"}</td>
                  <td>{new Date(j.effectiveDate).toLocaleDateString()}</td>
                  <td>{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`badge ${j.status}`}>{j.status}</span>
                  </td>
                  <td>{j.createdBy.name}</td>
                  <td>
                    <Link className="btn secondary" href={`/journals/${j.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              );
            })}
            {journals.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No journals yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
