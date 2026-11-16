import { columnKey } from "./text";
import { MEANING_LABELS, type ColumnChoice, type Meaning, type SourceFile } from "./types";

const HEADERS: Record<string, Meaning> = {
  txn_dt: "date",
  move_date: "date",
  sale_date: "date",
  value_date: "date",
  txn_date: "date",
  start_date: "started",
  brnch: "branch",
  branch_name: "branch",
  outlet: "branch",
  branch_tag: "branch",
  branch: "branch",
  previous_branch: "previous_branch",
  prod_nm: "product",
  item_name: "product",
  cust_nm: "customer",
  customer_name: "customer",
  person_name: "customer",
  phone_no: "phone",
  mobile_no: "phone",
  phone: "phone",
  cashier: "staff",
  cashier_name: "staff",
  staff_name: "staff",
  pay_mtd: "pay_type",
  tender: "pay_type",
  is_refund: "refund",
  rcpt: "receipt",
  pos_ref: "receipt",
  bank_ref: "reference",
  credit: "credit",
  debit: "debit",
  narration: "narration",
  from_acct: "from_account",
  to_acct: "to_account",
  account: "account",
  channel: "channel",
  town: "town",
  note: "note",
  role: "role",
  qty_in: "qty_in",
  on_hand: "on_hand",
  unit_amt: "unit_price",
  line_total: "amount",
  amt: "amount",
};

function meaningFor(column: string, headers: string[]): Meaning {
  const key = column.trim().toLowerCase();
  if (key === "qty_out") {
    const joined = headers.map((header) => header.toLowerCase());
    if (joined.some((header) => header === "on_hand" || header === "qty_in")) return "qty_out";
    return "qty";
  }
  return HEADERS[key] || "skip";
}

export function suggestColumns(files: SourceFile[], overrides: Record<string, Meaning> = {}): ColumnChoice[] {
  const choices: ColumnChoice[] = [];
  for (const file of files) {
    const headers = Object.keys(file.rows[0]?.cells || {});
    for (const column of headers) {
      const key = columnKey(file.file, column);
      const meaning = overrides[key] || meaningFor(column, headers);
      const samples: string[] = [];
      const seen = new Set<string>();
      for (const row of file.rows) {
        const value = row.cells[column]?.trim();
        if (!value || seen.has(value)) continue;
        seen.add(value);
        samples.push(value);
        if (samples.length === 3) break;
      }
      choices.push({ file: file.file, column, meaning, samples });
    }
  }
  return choices;
}

export function plainMeaning(meaning: Meaning): string {
  return MEANING_LABELS[meaning];
}

export function cell(row: SourceFile["rows"][number], choices: ColumnChoice[], meaning: Meaning): string {
  const choice = choices.find((item) => item.file === row.file && item.meaning === meaning);
  return choice ? row.cells[choice.column] || "" : "";
}

export function choicesFor(file: string, choices: ColumnChoice[]): ColumnChoice[] {
  return choices.filter((choice) => choice.file === file);
}
