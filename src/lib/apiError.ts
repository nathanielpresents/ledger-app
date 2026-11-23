import { NextResponse } from "next/server";
import { ForbiddenError } from "@/lib/rbac";
import { NotFoundError } from "@/lib/journalActions";

export function handleApiError(err: unknown) {
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  console.error(err);
  return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
}
