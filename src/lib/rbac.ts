import { Journal, Role } from "@prisma/client";

// Everything in this file is re-checked on the SERVER for every mutating
// request. In the old ERP page you shared, Edit/Delete buttons were only
// hidden in the browser with jQuery (`.hide()`), which is not a security
// control -- a request sent directly to the endpoint bypassed it entirely.
// Here, the API route handlers call these functions before touching the
// database, so hiding a button in the UI is just a convenience, never the
// actual enforcement.

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertRole(userRole: Role, allowed: Role[]) {
  if (!allowed.includes(userRole)) {
    throw new ForbiddenError(`Role ${userRole} is not permitted to perform this action.`);
  }
}

export function canCreateJournal(role: Role) {
  return role === "ACCOUNTANT" || role === "ADMIN";
}

export function canSubmitJournal(role: Role, userId: string, journal: Journal) {
  // Only the journal's own creator (or an admin) may submit it.
  if (journal.status !== "DRAFT") return false;
  if (role === "ADMIN") return true;
  return role === "ACCOUNTANT" && journal.createdById === userId;
}

// Maker-checker: the person who created/submitted a journal can never also
// approve or reject it, even if they hold the APPROVER role (e.g. a small
// team where one person has both roles in the system but must still get a
// second person to sign off). Admins are exempt only for break-glass use;
// consider removing this exemption once you have more than one approver.
export function canApproveOrReject(role: Role, userId: string, journal: Journal) {
  if (journal.status !== "SUBMITTED") return false;
  if (journal.createdById === userId) return false;
  return role === "APPROVER" || role === "ADMIN";
}

export function canPost(role: Role, journal: Journal) {
  if (journal.status !== "APPROVED") return false;
  return role === "APPROVER" || role === "ADMIN";
}

export function canReverse(role: Role, journal: Journal) {
  if (journal.status !== "POSTED") return false;
  if (journal.reversedBy) return false; // already reversed once
  return role === "APPROVER" || role === "ADMIN";
}
