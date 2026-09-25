import { readFileSync } from "node:fs";
import path from "node:path";
import { json } from "@/lib/http";

type DemoFile = {
  disclaimer: string;
  queries: { name: string; result: string; note: string }[];
};

let cached: DemoFile | null = null;

function catalog() {
  if (!cached) {
    const file = path.join(process.cwd(), "content", "sanctions_demo.json");
    cached = JSON.parse(readFileSync(file, "utf8")) as DemoFile;
  }
  return cached;
}

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const data = catalog();
  const matches = q
    ? data.queries.filter((row) =>
        row.name.toLowerCase().includes(q.toLowerCase()),
      )
    : data.queries;

  return json({
    disclaimer: data.disclaimer,
    demo: true,
    label: "Demo screen — not a government sanctions list.",
    query: q,
    results: matches,
  });
}
