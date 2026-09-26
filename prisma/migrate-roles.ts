/**
 * One-shot DB prep for the manager → logistics rename + warehouse enum.
 * Run before `npx prisma db push` if the database still has Role.manager:
 *
 *   npx tsx --env-file=.env prisma/migrate-roles.ts
 *   npx prisma db push
 *   npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'Role' AND e.enumlabel = 'manager'
      ) THEN
        ALTER TYPE "Role" RENAME VALUE 'manager' TO 'logistics';
      END IF;
    END $$;
  `);
  console.log("Role.manager → Role.logistics (if it still existed).");
  console.log("Next: npx prisma db push && npx prisma db seed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
