"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Line = { accountCode: string; description: string; debit: string; credit: string };

const emptyLine = (): Line => ({ accountCode: "", description: "", debit: "", credit: "" });

export default function NewJournalPage() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005 && totalDebit > 0;

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!balanced) {
      setError("Total debits must equal total credits before you can save.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/journals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reference,
        description,
        effectiveDate,
        lines: lines
          .filter((l) => l.accountCode)
          .map((l) => ({
            accountCode: l.accountCode,
            description: l.description,
            debit: l.debit || 0,
            credit: l.credit || 0,
          })),
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(typeof body.error === "string" ? body.error : "Could not save the journal. Check the lines.");
      return;
    }
    const created = await res.json();
    router.push(`/journals/${created.id}`);
  }

  return (
    <div className="container">
      <h2>New journal (draft)</h2>
      <form onSubmit={onSubmit} className="card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label>Reference</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div>
            <label>Effective date</label>
            <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <table style={{ marginBottom: 12 }}>
          <thead>
            <tr>
              <th>Account code</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <input value={l.accountCode} onChange={(e) => updateLine(i, { accountCode: e.target.value })} />
                </td>
                <td>
                  <input value={l.description} onChange={(e) => updateLine(i, { description: e.target.value })} />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={l.debit}
                    onChange={(e) => updateLine(i, { debit: e.target.value, credit: "" })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={l.credit}
                    onChange={(e) => updateLine(i, { credit: e.target.value, debit: "" })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          className="btn secondary"
          onClick={() => setLines((prev) => [...prev, emptyLine()])}
          style={{ marginBottom: 12 }}
        >
          + Add line
        </button>

        <p className={balanced ? "muted" : "error"}>
          Debit total: {totalDebit.toFixed(2)} — Credit total: {totalCredit.toFixed(2)}
          {!balanced && " (must match)"}
        </p>

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={submitting || !balanced}>
          {submitting ? "Saving..." : "Save as draft"}
        </button>
      </form>
    </div>
  );
}
