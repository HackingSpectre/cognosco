import { cell } from "./mapping";
import { nameOf } from "./picture";
import { monthKey, naira, normName } from "./text";
import type { ColumnChoice, Finding, Picture, RowPreview, SourceFile } from "./types";

export const TRADE_QUESTIONS = [
  "Why did one branch sell less in September?",
  "Which items are about to run out?",
  "Who has been giving unusual refunds?",
  "Which customers may stop buying?",
  "Where does the stock not add up?",
  "Which branch deposited less cash than it recorded?",
  "How many customers do we really have?",
  "What should we do this week?",
  "Which cashier moved between branches?",
  "What sold the most in October?",
];

export const PAYMENT_QUESTIONS = [
  "Is money moving in a circle?",
  "Did one account pass money on quickly?",
  "How many account holders do we really have?",
  "What should we do this week?",
];

export function questionsFor(pack: Picture["pack"]): string[] {
  return pack === "payments" ? PAYMENT_QUESTIONS : TRADE_QUESTIONS;
}

function rowsOf(finding?: Finding): RowPreview[] {
  return finding?.rows || [];
}

export function answerQuestion(question: string, picture: Picture, findings: Finding[], files: SourceFile[], choices: ColumnChoice[]): { text: string; rows: RowPreview[] } {
  const asked = question.toLowerCase();
  const finding = (kind: string) => findings.find((item) => item.kind === kind);

  if (asked.includes("circle") || asked.includes("ring of")) {
    const item = finding("fraud_ring");
    return item
      ? { text: `${item.detail} ${item.reason}`, rows: item.rows }
      : { text: "Cognosco does not see a circle of large transfers in these files.", rows: [] };
  }
  if (asked.includes("pass money") || asked.includes("sent it on") || asked.includes("quickly")) {
    const item = finding("mule");
    return item
      ? { text: `${item.detail} ${item.reason}`, rows: item.rows }
      : { text: "Cognosco does not see an account that took money from many people and sent it straight on.", rows: [] };
  }
  if (asked.includes("september") || asked.includes("sell less") || (asked.includes("lose") && asked.includes("branch"))) {
    const drop = findings.find((item) => item.kind === "sales_drop");
    const stock = findings.find((item) => item.kind === "stock_gap");
    const parts = [drop?.detail, stock?.detail].filter(Boolean);
    return {
      text: parts.length
        ? `${parts.join(" ")} The quieter month and the missing stock sit at the same place.`
        : "Cognosco cannot see a September shortfall in these files.",
      rows: [...rowsOf(drop), ...rowsOf(stock)].slice(0, 8),
    };
  }
  if (asked.includes("run out") || asked.includes("stock out")) {
    const item = finding("stockout");
    return item ? { text: `${item.detail} ${item.reason}`, rows: item.rows } : { text: "No item is within two weeks of running out.", rows: [] };
  }
  if (asked.includes("refund")) {
    const item = finding("refund_ring");
    return item ? { text: `${item.title}. ${item.detail} ${item.reason}`, rows: item.rows } : { text: "No cashier stands out for refunds.", rows: [] };
  }
  if (asked.includes("stop buying") || asked.includes("gone quiet") || asked.includes("customers may")) {
    const item = finding("churn");
    return item ? { text: `${item.detail} ${item.reason}`, rows: item.rows } : { text: "Regular customers are still buying.", rows: [] };
  }
  if (asked.includes("stock") && (asked.includes("not add") || asked.includes("missing") || asked.includes("where"))) {
    const items = findings.filter((item) => item.kind === "stock_gap");
    if (!items.length) return { text: "The stock sheets and the sales records agree.", rows: [] };
    return { text: items.map((item) => item.detail).join(" "), rows: items.flatMap((item) => item.rows).slice(0, 8) };
  }
  if (asked.includes("deposited") || asked.includes("cash")) {
    const item = finding("cash_gap");
    return item ? { text: `${item.title}. ${item.detail} ${item.reason}`, rows: item.rows } : { text: "Branch deposits line up with cash sales.", rows: [] };
  }
  if (asked.includes("how many")) {
    if (picture.pack === "payments") {
      return {
        text: `The files name ${picture.rawCustomerRows.toLocaleString("en-GB")} account-holder rows. Cognosco joins them into ${picture.customers.length.toLocaleString("en-GB")} people.`,
        rows: [],
      };
    }
    return {
      text: `The files mention customers in ${picture.rawCustomerRows.toLocaleString("en-GB")} rows. After joining the same person across spellings and phone numbers, Cognosco counts ${picture.customers.length.toLocaleString("en-GB")} customers.`,
      rows: [],
    };
  }
  if (asked.includes("this week") || asked.includes("what should")) {
    const steps = findings.slice(0, 4).map((item, index) => `${index + 1}. ${item.title}.`);
    return {
      text: steps.length ? `Start here. ${steps.join(" ")}` : "Nothing in these files needs a decision this week.",
      rows: findings.slice(0, 3).flatMap((item) => item.rows).slice(0, 6),
    };
  }
  if (asked.includes("moved") || asked.includes("cashier")) {
    const moves: string[] = [];
    const rows: RowPreview[] = [];
    for (const file of files) {
      for (const row of file.rows) {
        const earlier = cell(row, choices, "previous_branch").trim();
        const name = cell(row, choices, "staff").trim();
        const now = cell(row, choices, "branch").trim();
        if (!earlier || !name) continue;
        moves.push(`${normName(name).replace(/\b[a-z]/g, (letter) => letter.toUpperCase())} worked at ${earlier} and is now at ${now}.`);
        rows.push({ file: row.file, title: file.title, line: row.line, summary: `${name}, ${earlier} then ${now}` });
      }
    }
    return moves.length
      ? { text: moves.join(" "), rows }
      : { text: "The staff list does not show anyone who moved.", rows: [] };
  }
  if (asked.includes("sold the most") || (asked.includes("october") && asked.includes("sold"))) {
    const totals = new Map<string, { qty: number; amount: number; ref: Picture["sales"][number] }>();
    picture.sales.filter((sale) => monthKey(sale.date) === "2026-10").forEach((sale) => {
      const current = totals.get(sale.productId) || { qty: 0, amount: 0, ref: sale };
      current.qty += sale.qty;
      current.amount += sale.amount;
      totals.set(sale.productId, current);
    });
    const top = [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount)[0];
    if (!top) return { text: "There are no October sales in these files.", rows: [] };
    const sale = top[1].ref;
    return {
      text: `In October, ${nameOf(picture.products, top[0])} brought in the most money: ${naira(top[1].amount)} from ${top[1].qty.toLocaleString("en-GB")} units.`,
      rows: [{ file: sale.ref.file, title: "Sales records", line: sale.ref.line, summary: `${nameOf(picture.products, top[0])}, ${naira(sale.amount)}` }],
    };
  }

  return {
    text: "Cognosco cannot answer that from these files. Try one of the questions on this page.",
    rows: [],
  };
}
