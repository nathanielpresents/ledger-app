import { JournalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ForbiddenError } from "@/lib/rbac";

// Centralizes "load journal, check the transition is allowed, apply it,
// write an audit row" so every action route follows the exact same safe
// pattern instead of re-implementing it (and risking drift) five times.
export async function transitionJournal(opts: {
  journalId: string;
  performedById: string;
  action: string;
  remark?: string;
  check: (journal: NonNullable<Awaited<ReturnType<typeof loadJournal>>>) => boolean;
  newStatus?: JournalStatus;
  extra?: (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    journal: NonNullable<Awaited<ReturnType<typeof loadJournal>>>
  ) => Promise<void>;
}) {
  const journal = await loadJournal(opts.journalId);
  if (!journal) throw new NotFoundError();
  if (!opts.check(journal)) {
    throw new ForbiddenError("This action is not allowed for the journal's current state or your role.");
  }

  return prisma.$transaction(async (tx) => {
    let updated = journal;
    if (opts.newStatus) {
      updated = (await tx.journal.update({
        where: { id: journal.id },
        data: {
          status: opts.newStatus,
          ...(opts.newStatus === "APPROVED" ? { approvedById: opts.performedById } : {}),
        },
        include: { lines: true, createdBy: true, approvedBy: true, reversedBy: true },
      })) as typeof journal;
    }
    if (opts.extra) await opts.extra(tx, journal);

    await tx.auditLog.create({
      data: {
        journalId: journal.id,
        action: opts.action,
        performedById: opts.performedById,
        remark: opts.remark,
      },
    });

    return updated;
  });
}

export function loadJournal(id: string) {
  return prisma.journal.findUnique({
    where: { id },
    include: { lines: true, createdBy: true, approvedBy: true, reversedBy: true },
  });
}

export class NotFoundError extends Error {
  constructor(message = "Journal not found") {
    super(message);
    this.name = "NotFoundError";
  }
}
