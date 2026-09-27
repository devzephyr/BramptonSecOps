/**
 * Moves one load along a real Greater Toronto Area route by writing positions straight to the
 * database, the same fields a driver's phone updates. For screen recordings and load testing:
 * nothing in the app exposes it, and it never touches statuses or anyone's duty log.
 *
 *   npx tsx --env-file=.env.local scripts/drive-route.ts LO-4420 [route 0-4] [seconds per step]
 */
import { prisma } from "../src/lib/db";
import { positionOn, ROUTES, SIM_STEPS } from "./routes";

const TRAIL_EVERY_MS = 10_000;

async function main() {
  const [loadRef, routeArg = "0", stepArg = "3"] = process.argv.slice(2);
  if (!loadRef) throw new Error("Usage: scripts/drive-route.ts <load ref> [route 0-4] [seconds per step]");
  const route = ROUTES[Number(routeArg) % ROUTES.length];
  const stepMs = Math.max(1, Number(stepArg)) * 1000;
  const loads = await prisma.load.findMany({ where: { loadRef }, select: { id: true, orgId: true, driverUserId: true } });
  if (loads.length !== 1) throw new Error(`Expected one load ${loadRef}, found ${loads.length}.`);
  const [load] = loads;

  let lastPing = 0;
  for (let step = 0; step <= SIM_STEPS; step++) {
    const point = positionOn(route, step / SIM_STEPS);
    const now = new Date();
    await prisma.load.update({ where: { id: load.id }, data: { lat: point.lat, lng: point.lng, positionAt: now } });
    if (now.getTime() - lastPing >= TRAIL_EVERY_MS) {
      lastPing = now.getTime();
      await prisma.positionPing.create({
        data: { orgId: load.orgId, loadId: load.id, driverId: load.driverUserId, lat: point.lat, lng: point.lng, recordedAt: now },
      });
    }
    console.log(`${loadRef} ${step}/${SIM_STEPS} ${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`);
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
