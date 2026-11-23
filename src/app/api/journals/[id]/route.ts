import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

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
  if (!journal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(journal);
}
