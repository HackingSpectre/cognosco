"use server";

import { ask, breakRecord, clearChangedNumber, confirmColumns, confirmJoins, decide, openBranch, openPack, restoreRecord, setSplit, showChangedNumber, view } from "@/lib/workspace";
import type { Meaning, PackId } from "@/lib/types";

export async function loadView(branch = "", question = "") {
  return view(branch, question);
}

export async function startPack(pack: PackId) {
  return openPack(pack);
}

export async function saveColumns(overrides: Record<string, Meaning>) {
  return confirmColumns(overrides);
}

export async function saveSplit(id: string, separate: boolean) {
  return setSplit(id, separate);
}

export async function saveJoins() {
  return confirmJoins();
}

export async function saveDecision(id: string, status: "approved" | "rejected") {
  return decide(id, status);
}

export async function loadBranch(name: string) {
  return openBranch(name);
}

export async function loadAnswer(question: string) {
  return ask(question);
}

export async function changeFigure() {
  return showChangedNumber();
}

export async function undoFigure() {
  return clearChangedNumber();
}

export async function markRecordChanged() {
  return breakRecord();
}

export async function repairRecord() {
  return restoreRecord();
}
