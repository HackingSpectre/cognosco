import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Decision, PackId, SavedWork } from "./types";

const file = () => join(process.cwd(), ".cognosco", "work.json");

export function emptyWork(pack: PackId = "pharmacy"): SavedWork {
  return {
    pack,
    started: false,
    columnsConfirmed: false,
    overrides: {},
    joinsConfirmed: false,
    splits: [],
    decisions: [],
    tamper: null,
    decisionBroken: false,
  };
}

export function readWork(): SavedWork {
  try {
    const saved = JSON.parse(readFileSync(file(), "utf8")) as SavedWork;
    return { ...emptyWork(), ...saved, started: Boolean(saved.started), overrides: saved.overrides || {}, splits: saved.splits || [], decisions: saved.decisions || [] };
  } catch {
    return emptyWork();
  }
}

export function writeWork(work: SavedWork) {
  mkdirSync(join(process.cwd(), ".cognosco"), { recursive: true });
  writeFileSync(file(), JSON.stringify(work, null, 2));
}

export function decisionLink(previous: string, decision: Pick<Decision, "id" | "status" | "title" | "detail">): string {
  return createHash("sha256").update(`${previous}\n${decision.id}|${decision.status}|${decision.title}|${decision.detail}`).digest("hex");
}

export function withDecision(work: SavedWork, title: string, detail: string, status: Decision["status"]): SavedWork {
  const id = `d${work.decisions.length + 1}`;
  const prior = work.decisions.at(-1)?.previous || "start";
  const decision: Decision = {
    id,
    at: new Date().toISOString(),
    title,
    detail,
    status,
    previous: decisionLink(prior, { id, status, title, detail }),
  };
  return { ...work, decisions: [...work.decisions, decision] };
}

export function recordIntact(work: SavedWork): boolean {
  if (work.decisionBroken) return false;
  let previous = "start";
  for (const decision of work.decisions) {
    const next = decisionLink(previous, decision);
    if (decision.previous !== next) return false;
    previous = decision.previous;
  }
  return true;
}
