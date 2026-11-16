import { TRADE_QUESTIONS, PAYMENT_QUESTIONS, answerQuestion } from "./ask";
import { buildFindings } from "./findings";
import { suggestColumns } from "./mapping";
import { buildPicture } from "./picture";
import { loadPack } from "./sources";
import { decisionLink, emptyWork, recordIntact, withDecision } from "./store";
import type { SavedWork } from "./types";

function run(pack: "pharmacy" | "payments" | "distributor" | "clinics") {
  const files = loadPack(pack);
  const choices = suggestColumns(files);
  const picture = buildPicture(files, choices, [], pack === "pharmacy" ? "Balogun Pharmacy and Stores" : "Citygate Transfers", "2026-11-01", pack);
  const findings = buildFindings(picture, files);
  return { files, choices, picture, findings };
}

function assert(name: string, ok: boolean, detail = "") {
  if (!ok) {
    console.error("FAIL", name, detail);
    process.exitCode = 1;
  } else {
    console.log("ok", name, detail);
  }
}

const shop = run("pharmacy");
console.log(
  "shop",
  shop.picture.sales.length,
  "sales",
  shop.picture.customers.length,
  "customers from",
  shop.picture.rawCustomerRows,
  "products",
  shop.picture.products.length,
  "branches",
  shop.picture.branches.length,
);
console.log("findings", shop.findings.map((item) => `${item.kind}: ${item.title}`).join("\n"));

for (const kind of ["stock_gap", "refund_ring", "cash_gap", "stockout", "churn"]) {
  assert(kind, shop.findings.some((item) => item.kind === kind));
}
assert("branches", shop.picture.branches.length === 12, String(shop.picture.branches.length));
assert("one stock gap", shop.findings.filter((item) => item.kind === "stock_gap").length === 1, String(shop.findings.filter((item) => item.kind === "stock_gap").length));
assert("one cash gap", shop.findings.filter((item) => item.kind === "cash_gap").length === 1);

let answered = 0;
for (const question of TRADE_QUESTIONS) {
  const answer = answerQuestion(question, shop.picture, shop.findings, shop.files, shop.choices);
  const good = answer.text.length > 40 && !answer.text.startsWith("Cognosco cannot");
  if (!good) console.log(" weak question:", question, answer.text);
  if (good) answered += 1;
}
assert("questions", answered >= 9, `${answered}/10`);

for (const pack of ["distributor", "clinics"] as const) {
  const other = run(pack);
  for (const kind of ["stock_gap", "refund_ring", "cash_gap", "stockout", "churn"]) {
    assert(`${pack}:${kind}`, other.findings.some((item) => item.kind === kind));
  }
}

const pay = run("payments");
console.log("payments findings", pay.findings.map((item) => `${item.kind}: ${item.title}`).join("\n"));
assert("ring", pay.findings.some((item) => item.kind === "fraud_ring"));
assert("mule", pay.findings.some((item) => item.kind === "mule"));
for (const question of PAYMENT_QUESTIONS) {
  const answer = answerQuestion(question, pay.picture, pay.findings, pay.files, pay.choices);
  assert(`pay:${question}`, !answer.text.startsWith("Cognosco cannot") && !answer.text.startsWith("Cognosco does not"));
}

let work: SavedWork = emptyWork();
work = withDecision(work, "Count the shelf", "Packs are missing.", "approved");
assert("record holds", recordIntact(work));
work = { ...work, decisionBroken: true };
assert("record notices a change", !recordIntact(work));
work = { ...work, decisionBroken: false };
assert("record restored", recordIntact(work));

const link = decisionLink("start", work.decisions[0]);
assert("link matches", link === work.decisions[0].previous);

if (process.exitCode) console.error("selfcheck failed");
else console.log("selfcheck passed");
