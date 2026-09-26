import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgres://unused@localhost/unused";
async function main() {
  const { isOrgEvidenceKey, evidenceKey } = await import("../src/lib/evidence-storage");
  const { hashEnrollmentCode, newEnrollmentCode } = await import("../src/lib/auth");
  const { mergeRequestedPatch } = await import("../src/lib/cases");
  const org = "org123";
  assert.ok(isOrgEvidenceKey(evidenceKey(org, "bill of lading.pdf"), org));
  assert.ok(!isOrgEvidenceKey(`${org}/../../etc/passwd`, org));
  assert.ok(!isOrgEvidenceKey(`${org}/1_0123456789abcdef_a/../../x`, org));
  assert.ok(!isOrgEvidenceKey(`other/1_0123456789abcdef_a`, org));
  const { code, hash } = newEnrollmentCode();
  assert.equal(hashEnrollmentCode(code), hash);
  assert.equal(hashEnrollmentCode(code.replace(/-/g, "").toLowerCase()), hash);
  assert.equal(hashEnrollmentCode(` ${code.toLowerCase()} `), hash);
  assert.deepEqual(mergeRequestedPatch({ a: "1" }, { requested: { b: 2, c: "x", "bad key": "y" } }), { a: "1", c: "x" });
  console.log("checks ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
