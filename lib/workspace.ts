import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TRADE_QUESTIONS, answerQuestion, questionsFor } from "./ask";
import { buildFindings, alsoNoticed } from "./findings";
import { plainMeaning, suggestColumns } from "./mapping";
import { buildPicture } from "./picture";
import { cell } from "./mapping";
import { copyPack, loadPack, packMeta } from "./sources";
import { decisionLink, readWork, recordIntact, withDecision, writeWork } from "./store";
import { monthKey, monthLabel, naira } from "./text";
import type { Finding, Meaning, PackId, Picture, SavedWork, SourceFile } from "./types";

export type ColumnView = {
  file: string;
  title: string;
  rows: number;
  columns: { column: string; meaning: Meaning; plain: string; samples: string[] }[];
};

export type AppView = {
  pack: PackId;
  business: string;
  about: string;
  columnsConfirmed: boolean;
  joinsConfirmed: boolean;
  sources: { file: string; title: string; rows: number; columns: number }[];
  columns: ColumnView[];
  joins: {
    headline: string;
    detail: string;
    examples: { title: string; because: string; rows: string[] }[];
    uncertain: { id: string; left: string; right: string; because: string; keptSeparate: boolean }[];
  } | null;
  businessView: {
    sales: string;
    moved: string;
    customers: string;
    rawCustomers: string;
    products: number;
    branchCount: number;
    accounts: number;
    months: { label: string; share: number; amount: string }[];
    branchList: { name: string; sales: string; note: string }[];
    notices: string[];
  } | null;
  branch: {
    name: string;
    sales: string;
    months: { label: string; sales: string }[];
    items: { name: string; qty: string; amount: string }[];
    rows: { summary: string; file: string; line: number }[];
  } | null;
  findings: Finding[];
  notices: string[];
  questions: string[];
  answer: { text: string; rows: Finding["rows"] } | null;
  waiting: { id: string; title: string; detail: string; done: boolean }[];
  record: { title: string; detail: string; status: string; when: string }[];
  recordOk: boolean;
  recordNote: string;
  changeNote: string;
  monday: string[];
  results: { label: string; detail: string; ok: boolean }[];
  resultsSummary: string;
};

const cache = new Map<string, { picture: Picture; findings: Finding[]; files: SourceFile[] }>();

function filesFor(work: SavedWork): SourceFile[] {
  const files = work.tamper ? copyPack(work.pack) : loadPack(work.pack);
  if (work.tamper) {
    const file = files.find((item) => item.file === work.tamper!.file);
    const row = file?.rows.find((item) => item.line === work.tamper!.line);
    if (row) row.cells[work.tamper.column] = work.tamper.to;
  }
  return files;
}

function ready(work: SavedWork) {
  const files = filesFor(work);
  const choices = suggestColumns(files, work.overrides);
  const key = JSON.stringify({
    pack: work.pack,
    overrides: work.overrides,
    splits: work.splits,
    tamper: work.tamper,
  });
  const hit = cache.get(key);
  if (hit) return { ...hit, choices, files };
  const meta = packMeta(work.pack);
  const picture = buildPicture(files, choices, work.splits, meta.business, "2026-11-01", work.pack);
  const findings = buildFindings(picture, files);
  cache.set(key, { picture, findings, files });
  return { picture, findings, choices, files };
}

function recommendationCopy(finding: Finding): { title: string; detail: string } | null {
  if (finding.kind === "stock_gap") return { title: "Count this item on the shelf", detail: finding.detail };
  if (finding.kind === "cash_gap") return { title: "Match the cash sales to the bank deposit", detail: finding.detail };
  if (finding.kind === "refund_ring") return { title: "Review these refunds before another is paid", detail: finding.detail };
  if (finding.kind === "stockout") return { title: "Reorder the items that are running out", detail: finding.detail };
  if (finding.kind === "churn") return { title: "Call the customers who have gone quiet", detail: finding.detail };
  if (finding.kind === "fraud_ring") return { title: "Pause the accounts in the circle", detail: finding.detail };
  if (finding.kind === "mule") return { title: "Ask where this money came from", detail: finding.detail };
  return null;
}

function score(picture: Picture, findings: Finding[], files: SourceFile[], choices: ReturnType<typeof suggestColumns>): AppView["results"] {
  const truth = JSON.parse(readFileSync(join(process.cwd(), "data", "packs", picture.pack, "truth.json"), "utf8"));
  const packTruth = truth;
  const lines: AppView["results"] = [];

  const saleByRef = new Map(picture.sales.map((sale) => [`${sale.ref.file}:${sale.ref.line}`, sale]));
  const refundByRef = new Map(picture.refunds.map((refund) => [`${refund.ref.file}:${refund.ref.line}`, refund]));
  const stockByRef = new Map(picture.stock.map((move) => [`${move.ref.file}:${move.ref.line}`, move]));
  const recall = (groups: Record<string, string[]>, resolve: (file: string, line: number) => string) => {
    let good = 0;
    let total = 0;
    Object.values(groups).forEach((refs) => {
      const ids = refs
        .map((ref) => {
          const [name, num] = ref.split(":");
          return resolve(`${name}.csv`, Number(num) + 1);
        })
        .filter(Boolean);
      if (ids.length < 2) return;
      total += 1;
      if (new Set(ids).size === 1) good += 1;
    });
    return total ? good / total : 1;
  };

  const customerRecall = recall(packTruth.groups.customer || {}, (file, line) => {
    const key = `${file}:${line}`;
    return saleByRef.get(key)?.customerId || refundByRef.get(key)?.customerId || "";
  });
  const productRecall = picture.pack !== "payments"
    ? recall(packTruth.groups.product || {}, (file, line) => {
        const key = `${file}:${line}`;
        return saleByRef.get(key)?.productId || stockByRef.get(key)?.productId || "";
      })
    : 1;
  const joined = picture.pack === "payments" ? customerRecall : Math.min(customerRecall, productRecall);
  lines.push({
    label: "Same people and items joined",
    detail: `${Math.round(joined * 100)}% of the groups we planted were joined correctly.`,
    ok: joined >= 0.95,
  });

  if (picture.pack !== "payments") {
    const kinds = ["stock_gap", "refund_ring", "cash_gap", "stockout", "churn"];
    const found = kinds.filter((kind) => findings.some((item) => item.kind === kind));
    lines.push({
      label: "Problems placed in the files",
      detail: `${found.length} of 5 were found: missing stock, unusual refunds, a cash shortfall, items running out, and quiet customers.`,
      ok: found.length === 5,
    });
    const answered = TRADE_QUESTIONS.filter((question) => {
      const answer = answerQuestion(question, picture, findings, files, choices);
      return answer.rows.length > 0 || /counts|joined|Start here|worked at|brought in/.test(answer.text);
    });
    lines.push({
      label: "Questions answered from the records",
      detail: `${answered.length} of ${TRADE_QUESTIONS.length} questions came back with a direct answer.`,
      ok: answered.length >= 9,
    });
  } else {
    const foundRing = findings.some((item) => item.kind === "fraud_ring");
    const foundMule = findings.some((item) => item.kind === "mule");
    lines.push({
      label: "Problems placed in the transfers",
      detail: `${Number(foundRing) + Number(foundMule)} of 2 were found: money moving in a circle, and money passed on quickly.`,
      ok: foundRing && foundMule,
    });
  }

  return lines;
}

function shell(work: SavedWork, extra: Partial<AppView> = {}): AppView {
  const meta = packMeta(work.pack);
  const files = loadPack(work.pack);
  const choices = suggestColumns(files, work.overrides);
  return {
    pack: work.pack,
    business: meta.business,
    about: meta.about,
    columnsConfirmed: work.columnsConfirmed,
    joinsConfirmed: work.joinsConfirmed,
    sources: files.map((file) => ({
      file: file.file,
      title: file.title,
      rows: file.rows.length,
      columns: Object.keys(file.rows[0]?.cells || {}).length,
    })),
    columns: files.map((file) => ({
      file: file.file,
      title: file.title,
      rows: file.rows.length,
      columns: choices.filter((choice) => choice.file === file.file).map((choice) => ({ ...choice, plain: plainMeaning(choice.meaning) })),
    })),
    joins: null,
    businessView: null,
    branch: null,
    findings: [],
    notices: [],
    questions: questionsFor(work.pack),
    answer: null,
    waiting: [],
    record: work.decisions.map((decision) => ({
      title: decision.title,
      detail: decision.detail,
      status: decision.status === "approved" ? "Approved" : "Set aside",
      when: decision.at.slice(0, 16).replace("T", " "),
    })),
    recordOk: recordIntact(work),
    recordNote: work.decisions.length ? "Nothing has been checked yet." : "Nothing has been decided yet.",
    changeNote: "",
    monday: [],
    results: [],
    resultsSummary: "",
    ...extra,
  };
}

export function view(branchName = "", question = ""): AppView {
  const work = readWork();
  const meta = packMeta(work.pack);
  if (!work.columnsConfirmed) return shell(work);
  const { picture, findings, choices, files } = ready(work);
  const open = work.columnsConfirmed && work.joinsConfirmed;
  const months = new Map<string, number>();
  picture.sales.forEach((sale) => {
    if (!sale.date) return;
    const key = monthKey(sale.date);
    months.set(key, (months.get(key) || 0) + sale.amount);
  });
  const monthRows = [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, sales]) => ({ label: monthLabel(key), sales }));
  const maxMonth = Math.max(...monthRows.map((month) => month.sales), 1);

  const salesByBranch = new Map<string, number>();
  picture.sales.forEach((sale) => salesByBranch.set(sale.branchId, (salesByBranch.get(sale.branchId) || 0) + sale.amount));
  const branchRows = picture.branches
    .map((branch) => {
      const sales = salesByBranch.get(branch.id) || 0;
      const note = findings.some((item) => item.title.includes(branch.name)) ? "Needs a look" : "Quiet";
      return { name: branch.name, sales: naira(sales), note, raw: sales };
    })
    .sort((a, b) => b.raw - a.raw);

  const selected = picture.branches.find((branch) => branch.name === branchName);
  let branch: AppView["branch"] = null;
  if (selected && open) {
    const sales = picture.sales.filter((sale) => sale.branchId === selected.id);
    const byMonth = new Map<string, number>();
    const byItem = new Map<string, { qty: number; amount: number }>();
    sales.forEach((sale) => {
      const key = monthKey(sale.date);
      byMonth.set(key, (byMonth.get(key) || 0) + sale.amount);
      const item = byItem.get(sale.productId) || { qty: 0, amount: 0 };
      item.qty += sale.qty;
      item.amount += sale.amount;
      byItem.set(sale.productId, item);
    });
    branch = {
      name: selected.name,
      sales: naira(sales.reduce((sum, sale) => sum + sale.amount, 0)),
      months: [...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, amount]) => ({ label: monthLabel(key), sales: naira(amount) })),
      items: [...byItem.entries()]
        .sort((a, b) => b[1].amount - a[1].amount)
        .slice(0, 6)
        .map(([id, item]) => ({
          name: picture.products.find((product) => product.id === id)?.name || "Item",
          qty: item.qty.toLocaleString("en-GB"),
          amount: naira(item.amount),
        })),
      rows: sales.slice(0, 12).map((sale) => ({
        summary: `${sale.date}, ${picture.products.find((product) => product.id === sale.productId)?.name}, ${sale.qty} sold, ${naira(sale.amount)}`,
        file: sale.ref.file,
        line: sale.ref.line,
      })),
    };
  }

  const exampleRows = new Map<string, string[]>();
  for (const sale of picture.sales) {
    if (exampleRows.size >= 3 && ![...exampleRows.keys()].includes(sale.customerId)) continue;
    const rows = exampleRows.get(sale.customerId) || [];
    if (rows.length >= 3) continue;
    if (!picture.customers.slice(0, 3).some((customer) => customer.id === sale.customerId) && exampleRows.size >= 3) continue;
    if (!picture.customers.slice(0, 3).some((customer) => customer.id === sale.customerId)) continue;
    rows.push(`Sales records, line ${sale.ref.line}`);
    exampleRows.set(sale.customerId, rows);
  }
  const examples = picture.customers.slice(0, 3).map((customer) => ({
    title: customer.name,
    because: customer.extra[0] ? `Joined on the phone number ${customer.extra[0]}.` : "Joined on the same name.",
    rows: exampleRows.get(customer.id) || [],
  }));

  const waiting = findings
    .map((finding) => {
      const copy = recommendationCopy(finding);
      if (!copy) return null;
      const done = work.decisions.some((decision) => decision.title === copy.title);
      return { id: finding.id, title: copy.title, detail: copy.detail, done };
    })
    .filter((item): item is AppView["waiting"][number] => Boolean(item));

  const monday = open
    ? [
        `${meta.business}, week ending 1 November 2026.`,
        findings.length
          ? `Cognosco found ${findings.length} things that need a person. ${findings.slice(0, 3).map((item) => item.title).join(". ")}.`
          : "Nothing in the files needs a decision this week.",
        work.decisions.length
          ? `${work.decisions.filter((item) => item.status === "approved").length} next steps have been approved and kept in the decision record.`
          : "No next step has been approved yet.",
      ]
    : [];

  const results = open ? score(picture, findings, files, choices) : [];
  const resultsSummary = results.length
    ? results.every((line) => line.ok)
      ? "The sample problems were found, and the questions were answered from the records."
      : "Some checks are still short. Confirm the columns and the joins, then open this page again."
    : "";

  const moved = files.flatMap((file) =>
    file.rows
      .filter((row) => cell(row, choices, "previous_branch").trim())
      .map((row) => `${cell(row, choices, "staff")} moved from ${cell(row, choices, "previous_branch")} to ${cell(row, choices, "branch")}.`),
  );

  return {
    pack: work.pack,
    business: meta.business,
    about: meta.about,
    columnsConfirmed: work.columnsConfirmed,
    joinsConfirmed: work.joinsConfirmed,
    sources: files.map((file) => ({
      file: file.file,
      title: file.title,
      rows: file.rows.length,
      columns: Object.keys(file.rows[0]?.cells || {}).length,
    })),
    columns: files.map((file) => ({
      file: file.file,
      title: file.title,
      rows: file.rows.length,
      columns: choices
        .filter((choice) => choice.file === file.file)
        .map((choice) => ({ ...choice, plain: plainMeaning(choice.meaning) })),
    })),
    joins: work.columnsConfirmed
      ? {
          headline: `${picture.rawCustomerRows.toLocaleString("en-GB")} rows name people. Cognosco joins them into ${picture.customers.length.toLocaleString("en-GB")}.`,
          detail: picture.pack === "pharmacy"
            ? `${picture.products.length} items and ${picture.branches.length} branches were joined the same way, including names that were spelled differently.`
            : `${picture.accounts.length} accounts were joined to the people who hold them.`,
          examples,
          uncertain: picture.uncertain.map((item) => ({
            ...item,
            keptSeparate: work.splits.includes(item.id),
          })),
        }
      : null,
    businessView: open
      ? {
          sales: naira(picture.sales.reduce((sum, sale) => sum + sale.amount, 0)),
          moved: naira(picture.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)),
          customers: picture.customers.length.toLocaleString("en-GB"),
          rawCustomers: picture.rawCustomerRows.toLocaleString("en-GB"),
          products: picture.products.length,
          branchCount: picture.branches.length,
          accounts: picture.accounts.length,
          months: monthRows.map((month) => ({ label: month.label, share: month.sales / maxMonth, amount: naira(month.sales) })),
          branchList: branchRows.map(({ name, sales, note }) => ({ name, sales, note })),
          notices: [...alsoNoticed(picture), ...moved],
        }
      : null,
    branch,
    findings: open ? findings : [],
    notices: open ? [...alsoNoticed(picture), ...moved] : [],
    questions: questionsFor(work.pack),
    answer: open && question ? answerQuestion(question, picture, findings, files, choices) : null,
    waiting: open ? waiting : [],
    record: work.decisions.map((decision) => ({
      title: decision.title,
      detail: decision.detail,
      status: decision.status === "approved" ? "Approved" : "Set aside",
      when: decision.at.slice(0, 16).replace("T", " "),
    })),
    recordOk: recordIntact(work),
    recordNote: work.decisions.length
      ? recordIntact(work)
        ? "Every line still matches the line before it."
        : "An earlier line was changed. The record no longer matches."
      : "Nothing has been decided yet.",
    changeNote: work.tamper
      ? `A shelf count was changed after the files were brought in. On line ${work.tamper.line} of the stock sheet it went from ${work.tamper.from} to ${work.tamper.to}. Cognosco still has the original figure.`
      : "",
    monday,
    results,
    resultsSummary,
  };
}

function update(change: (work: SavedWork) => SavedWork) {
  const next = change(readWork());
  writeWork(next);
  return view();
}

export function openPack(pack: PackId) {
  cache.clear();
  writeWork({
    pack,
    started: true,
    columnsConfirmed: false,
    overrides: {},
    joinsConfirmed: false,
    splits: [],
    decisions: [],
    tamper: null,
    decisionBroken: false,
  });
  return view();
}

export function confirmColumns(overrides: Record<string, Meaning>) {
  return update((work) => ({ ...work, overrides, columnsConfirmed: true }));
}

export function setSplit(id: string, separate: boolean) {
  return update((work) => ({
    ...work,
    splits: separate ? [...new Set([...work.splits, id])] : work.splits.filter((item) => item !== id),
  }));
}

export function confirmJoins() {
  return update((work) => ({ ...work, joinsConfirmed: true }));
}

export function decide(id: string, status: "approved" | "rejected") {
  return update((work) => {
    const { findings } = ready(work);
    const finding = findings.find((item) => item.id === id);
    const copy = finding ? recommendationCopy(finding) : null;
    if (!copy) return work;
    if (work.decisions.some((decision) => decision.title === copy.title)) return work;
    return withDecision(work, copy.title, copy.detail, status);
  });
}

export function showChangedNumber() {
  return update((work) => {
    const { files, choices } = ready(work);
    const stock = files.find((file) => file.file === "stock.csv");
    const row = stock?.rows.find((item) => cell(item, choices, "on_hand"));
    if (!stock || !row) return work;
    const column = choices.find((choice) => choice.file === "stock.csv" && choice.meaning === "on_hand")?.column || "On_Hand";
    const from = row.cells[column];
    return { ...work, tamper: { file: "stock.csv", line: row.line, column, from, to: String(Number(from || 0) + 500) } };
  });
}

export function clearChangedNumber() {
  return update((work) => ({ ...work, tamper: null }));
}

export function breakRecord() {
  return update((work) => {
    if (!work.decisions.length) return work;
    const decisions = work.decisions.map((decision, index) => (index === 0 ? { ...decision, detail: `${decision.detail} ` } : decision));
    return { ...work, decisions, decisionBroken: true };
  });
}

export function restoreRecord() {
  return update((work) => {
    let previous = "start";
    const decisions = work.decisions.map((decision) => {
      const clean = { ...decision, detail: decision.detail.trimEnd() };
      const next = { ...clean, previous: decisionLink(previous, clean) };
      previous = next.previous;
      return next;
    });
    return { ...work, decisions, decisionBroken: false };
  });
}

export function ask(question: string) {
  return view("", question);
}

export function openBranch(name: string) {
  return view(name);
}
