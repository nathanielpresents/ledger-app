import { z } from "zod";

// Server-side validation. The old ERP relied on client-side jQuery validation
// ("data-val-required", etc.) as if it were a real check -- it isn't; it's
// only a convenience for honest users. Every field here is re-validated by
// the API route using this schema before anything touches the database.
export const journalLineSchema = z
  .object({
    accountCode: z.string().min(1, "Account code is required").max(40),
    accountDesc: z.string().max(200).optional(),
    debit: z.coerce.number().min(0).max(999_999_999_999),
    credit: z.coerce.number().min(0).max(999_999_999_999),
    description: z.string().max(400).optional(),
  })
  .refine((line) => !(line.debit > 0 && line.credit > 0), {
    message: "A single line cannot have both a debit and a credit amount.",
  })
  .refine((line) => line.debit > 0 || line.credit > 0, {
    message: "Each line needs either a debit or a credit amount.",
  });

export const createJournalSchema = z
  .object({
    reference: z.string().max(60).optional(),
    description: z.string().max(400).optional(),
    effectiveDate: z.coerce.date(),
    lines: z.array(journalLineSchema).min(2, "A journal needs at least two lines."),
  })
  .refine(
    (journal) => {
      const totalDebit = journal.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = journal.lines.reduce((sum, l) => sum + l.credit, 0);
      // Compare in cents to avoid floating-point rounding surprises.
      return Math.round(totalDebit * 100) === Math.round(totalCredit * 100);
    },
    { message: "Total debits must equal total credits.", path: ["lines"] }
  );

export const remarkSchema = z.object({
  remark: z.string().max(400).optional(),
});
