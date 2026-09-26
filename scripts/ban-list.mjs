import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  ".agents",
]);
const SKIP_FILES = new Set(["package-lock.json"]);
const SKIP_PATHS = new Set([
  path.join(repoRoot, "scripts", "ban-list.mjs"),
  path.join(repoRoot, ".github", "workflows", "ban-list.yml"),
]);

// Official image env names. The rest of those files still scans.
const ALLOW_LINE = /POSTGRES_PASSWORD|MINIO_ROOT_PASSWORD/;

const RULES = [
  { label: "whatsapp", re: /whatsapp/i },
  { label: "shared-secret word", re: /password/i },
  { label: "sms", re: /\bsms\b/i },
  { label: "forgot shared-secret flow", re: /forgot password/i },
  { label: "biometrically signed", re: /biometrically signed/i },
  { label: "cccs-certified", re: /cccs-certified/i },
  { label: "just enough verification", re: /just enough verification/i },
  {
    label: "partners verify our passkeys independently",
    re: /partners verify our passkeys independently/i,
  },
  { label: "certified (whole word)", re: /\bcertified\b/i },
];

async function walk(dir, hits) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, hits);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_FILES.has(entry.name)) continue;
    if (SKIP_PATHS.has(full)) continue;
    await scanFile(full, hits);
  }
}

async function scanFile(filePath, hits) {
  let text;
  try {
    text = await readFile(filePath, "utf8");
  } catch {
    return;
  }
  if (text.includes("\0")) return;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        if (rule.label === "shared-secret word" && ALLOW_LINE.test(line))
          continue;
        hits.push({
          file: path.relative(repoRoot, filePath),
          line: i + 1,
          rule: rule.label,
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  }
}

const hits = [];
await walk(repoRoot, hits);

if (hits.length > 0) {
  for (const hit of hits) {
    console.error(`${hit.file}:${hit.line}: ${hit.rule}: ${hit.excerpt}`);
  }
  process.exit(1);
}

console.log("ban-list: no matches");
