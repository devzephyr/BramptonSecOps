import { readFileSync } from "node:fs";
import path from "node:path";

export type Playbook = {
  title: string;
  dualControl: boolean;
  summary: string;
  redFlagPatterns: string[];
  oobSteps: string[];
  doNot: string[];
};

export type PlaybookFile = {
  requestTypes: Record<string, Playbook>;
};

let cache: PlaybookFile | null = null;

export function playbooks(): PlaybookFile {
  if (!cache) {
    const file = path.join(process.cwd(), "content", "verify_playbooks.json");
    cache = JSON.parse(readFileSync(file, "utf8")) as PlaybookFile;
  }
  return cache;
}

export function playbookFor(requestType: string): Playbook {
  const book = playbooks().requestTypes[requestType];
  if (!book) {
    throw new Error(`Unknown request type: ${requestType}`);
  }
  return book;
}
