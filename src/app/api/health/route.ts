import { prisma } from "@/lib/db";
import { json } from "@/lib/http";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ ok: true, db: "up" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database error";
    return json({ ok: false, db: "down", error: message }, 503);
  }
}
