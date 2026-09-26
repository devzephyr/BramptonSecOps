// Operator recovery: issue an enrollment code straight to the database.
// Usage: npx tsx --env-file=.env.local scripts/issue-code.ts <org-slug> <username> [--revoke-passkeys]
// A code only unlocks enrollment for an account with no passkey, so a lost-device
// recovery needs --revoke-passkeys to clear the old ones first.
import {
  enrollmentExpiry,
  findAccount,
  newEnrollmentCode,
} from "../src/lib/auth";
import { prisma } from "../src/lib/db";

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke-passkeys");
  const [org, username] = args.filter((a) => a !== "--revoke-passkeys");
  if (!org || !username) {
    throw new Error(
      "Usage: scripts/issue-code.ts <org-slug> <username> [--revoke-passkeys]",
    );
  }

  const user = await findAccount(username, org);
  if (!user) throw new Error(`No account "${username}" in org "${org}".`);

  const passkeys = await prisma.webAuthnCredential.count({
    where: { userId: user.id },
  });
  if (passkeys > 0 && !revoke) {
    throw new Error(
      `${username} has ${passkeys} passkey(s); a code does nothing until they are gone. Re-run with --revoke-passkeys.`,
    );
  }

  const { code, hash } = newEnrollmentCode();
  await prisma.$transaction([
    prisma.webAuthnCredential.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        enrollmentTokenHash: hash,
        enrollmentTokenExpires: enrollmentExpiry(),
      },
    }),
  ]);
  if (passkeys > 0) console.log(`Revoked ${passkeys} passkey(s).`);
  console.log(`${username} / ${org} / ${code}  (expires in 24h, one use)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
