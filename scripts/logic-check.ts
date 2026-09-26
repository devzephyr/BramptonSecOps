import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgres://unused@localhost/unused";
async function main() {
  const { evidenceKey } = await import("../src/lib/evidence-storage");
  const { hashEnrollmentCode, newEnrollmentCode } = await import("../src/lib/auth");
  const { mergeRequestedPatch } = await import("../src/lib/cases");
  const { ROUTE, SIM_STEPS, simPosition } = await import("../src/lib/tracking");
  const org = "org123";
  for (const label of ["bill of lading.pdf", "../../etc/passwd", "a/../../x", "photo.webp"]) {
    const key = evidenceKey(org, label);
    assert.match(key, /^org123\/\d+_[a-f0-9]{16}_[A-Za-z0-9._-]{1,80}$/, key);
  }
  const { code, hash } = newEnrollmentCode();
  assert.equal(hashEnrollmentCode(code), hash);
  assert.equal(hashEnrollmentCode(code.replace(/-/g, "").toLowerCase()), hash);
  assert.equal(hashEnrollmentCode(` ${code.toLowerCase()} `), hash);
  assert.deepEqual(mergeRequestedPatch({ a: "1" }, { requested: { b: 2, c: "x", "bad key": "y" } }), { a: "1", c: "x" });
  assert.deepEqual(simPosition(0), ROUTE[0]);
  assert.deepEqual(simPosition(SIM_STEPS), ROUTE[ROUTE.length - 1]);
  assert.deepEqual(simPosition(SIM_STEPS * 5), ROUTE[ROUTE.length - 1]);
  const mid = simPosition(SIM_STEPS / 2);
  assert.ok(mid.lat > ROUTE[0].lat && mid.lat < ROUTE[ROUTE.length - 1].lat);
  console.log("checks ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
