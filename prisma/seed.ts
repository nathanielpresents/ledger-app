// Creates a handful of starter accounts so you can log in and test the
// maker-checker workflow immediately after deploying.
// Run with: npm run seed
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string, role: Role, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  await upsertUser("admin@example.com", "System Admin", Role.ADMIN, "ChangeMe123!");
  await upsertUser("maker@example.com", "Alemu Accountant", Role.ACCOUNTANT, "ChangeMe123!");
  await upsertUser("checker@example.com", "Sara Approver", Role.APPROVER, "ChangeMe123!");
  console.log("Seeded users. IMPORTANT: change these passwords before real use.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
