import assert from "node:assert/strict";

process.env.DATABASE_URL ??= "postgres://unused@localhost/unused";
async function main() {
  const { evidenceKey } = await import("../src/lib/evidence-storage");
  const { hashEnrollmentCode, newEnrollmentCode } = await import("../src/lib/auth");
  const { mergeRequestedPatch } = await import("../src/lib/cases");
  const { ROUTE, SIM_STEPS, simPosition } = await import("./routes");
  const { DOC_TYPES, isDocType, parseAmountCents } = await import("../src/lib/policy");
  const { DocType } = await import("@prisma/client");
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
  assert.deepEqual([...DOC_TYPES].sort(), Object.values(DocType).sort());
  assert.ok(isDocType("invoice") && !isDocType("Invoice") && !isDocType(null));
  assert.equal(parseAmountCents(""), null);
  assert.equal(parseAmountCents(null), null);
  assert.equal(parseAmountCents("1,234.5"), 123450);
  assert.equal(parseAmountCents("$ 0.07"), 7);
  assert.equal(parseAmountCents("12"), 1200);
  for (const bad of ["-5", "1.234", "abc", "1e5", "9999999999"]) assert.equal(parseAmountCents(bad), undefined, bad);

  const { DutyStatus } = await import("@prisma/client");
  const { DUTY_STATUSES, summarizeHos } = await import("../src/lib/hos");
  const { dutyHash, GENESIS_HASH } = await import("../src/lib/duty");
  assert.deepEqual([...DUTY_STATUSES].sort(), Object.values(DutyStatus).sort());
  const H = 3600_000, M = 60_000, t0 = Date.UTC(2026, 8, 26, 6);
  const at = (status: (typeof DUTY_STATUSES)[number], offset: number) => ({ status, at: new Date(t0 + offset) });
  assert.equal(summarizeHos([], t0).breakOwed, false);
  assert.equal(summarizeHos([at("driving", 0)], t0 + 8 * H - M).breakOwed, false);
  assert.equal(summarizeHos([at("driving", 0)], t0 + 8 * H + 10 * M).overLimitMs, 10 * M);
  // A 20-minute stop is not a break: driving keeps accumulating.
  const short = [at("driving", 0), at("on_duty", 5 * H), at("driving", 5 * H + 20 * M)];
  assert.equal(summarizeHos(short, t0 + 8 * H + 20 * M).drivingMs, 8 * H);
  // Ten minutes into the owed break, twenty remain; at thirty the clock resets.
  const owed = [...short, at("off_duty", 8 * H + 20 * M)];
  assert.equal(summarizeHos(owed, t0 + 8 * H + 30 * M).breakLeftMs, 20 * M);
  assert.equal(summarizeHos(owed, t0 + 8 * H + 50 * M).drivingMs, 0);
  // On duty then off duty back to back is one continuous break.
  const split = [at("driving", 0), at("on_duty", 4 * H), at("off_duty", 4 * H + 15 * M), at("driving", 4 * H + 30 * M)];
  assert.equal(summarizeHos(split, t0 + 6 * H).drivingMs, 90 * M);
  assert.equal(summarizeHos([at("driving", 0), at("on_duty", 4 * H), at("driving", 4 * H + 29 * M)], t0 + 6 * H).drivingMs, 4 * H + 91 * M);
  const entry = {
    driverId: "d", seq: 1, kind: "status", status: "driving" as const, at: new Date(t0), lat: null, lng: null,
    loadId: null, note: null, source: "driver", refId: null, actorId: "d", prevHash: GENESIS_HASH,
  };
  assert.notEqual(dutyHash(entry), dutyHash({ ...entry, at: new Date(t0 - H) }), "back-dating changes the hash");
  assert.notEqual(dutyHash(entry), dutyHash({ ...entry, status: "off_duty" as const }));
  const { normalizeLoadRef } = await import("../src/lib/policy");
  assert.equal(normalizeLoadRef("4419"), "LO-4419");
  assert.equal(normalizeLoadRef(" lo-4419 "), "LO-4419");
  assert.equal(normalizeLoadRef("LO 12"), "LO-12");
  for (const bad of ["", "LO-", "44a", "PP-204", "12345678901"]) assert.equal(normalizeLoadRef(bad), null, bad);
  const { toFlagView } = await import("../src/lib/flags");
  const { referenceCode } = await import("../src/lib/reference");
  // Sentences stored by older versions still map to codes, so they translate.
  assert.deepEqual(toFlagView("dock does not match the file"), { code: "ON_FILE_MISMATCH", params: { field: "dock" } });
  assert.deepEqual(toFlagView("Not the domain on file (peelproduce.example)"), { code: "DOMAIN_NOT_ON_FILE", params: { onFile: "peelproduce.example" } });
  assert.equal(toFlagView("A mail check does not prove this request is real").code, "MAIL_AUTH_NOT_CHECKED");
  assert.equal(toFlagView("The message asks for access").code, "CREDENTIAL_ASK");
  assert.deepEqual(
    toFlagView({ code: "DOMAIN_NOT_ON_FILE", kind: "heuristic", detail: "x.co is not the domain on file (y.example)." }),
    { code: "DOMAIN_NOT_ON_FILE", params: { domain: "x.co", onFile: "y.example" } },
  );
  assert.deepEqual(toFlagView("something new"), { code: "OTHER", params: {}, text: "something new" });
  assert.equal(referenceCode("26e16a94fe7bbfcf9cf0e1aee8105490d0eb44c16e20b06fe3628667eb2101b0"), "26E1-6A94-FE7B");
  console.log("checks ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
