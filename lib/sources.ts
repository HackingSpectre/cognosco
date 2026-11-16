import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "./csv";
import type { PackId, SourceFile, SourceRow } from "./types";

const TRADE = [
  { file: "sales.csv", title: "Sales records" },
  { file: "stock.csv", title: "Stock sheets" },
  { file: "pos.csv", title: "Card and transfer payments" },
  { file: "bank.csv", title: "Bank statement" },
  { file: "staff.csv", title: "Staff list" },
];

const PACKS_META: Record<PackId, { business: string; about: string; files: { file: string; title: string }[] }> = {
  pharmacy: {
    business: "Balogun Pharmacy and Stores",
    about: "One sample. A pharmacy and shop with 12 branches. The files are fictional, and they are messy on purpose.",
    files: TRADE,
  },
  distributor: {
    business: "Okoro Wholesale",
    about: "One sample. A building-materials distributor with 12 depots. The files are fictional, and they are messy on purpose.",
    files: [
      { file: "sales.csv", title: "Invoices" },
      { file: "stock.csv", title: "Depot stock" },
      { file: "pos.csv", title: "Customer payments" },
      { file: "bank.csv", title: "Bank statement" },
      { file: "staff.csv", title: "Staff list" },
    ],
  },
  clinics: {
    business: "Haven Clinics",
    about: "One sample. A private clinic group with 12 sites. The files are fictional, and they are messy on purpose.",
    files: [
      { file: "sales.csv", title: "Bills" },
      { file: "stock.csv", title: "Supply stock" },
      { file: "pos.csv", title: "Front desk payments" },
      { file: "bank.csv", title: "Bank statement" },
      { file: "staff.csv", title: "Staff list" },
    ],
  },
  payments: {
    business: "Citygate Transfers",
    about: "One sample. A payments business. The same steps, with bank and mobile money records.",
    files: [
      { file: "people.csv", title: "Account holders" },
      { file: "movements.csv", title: "Transfers" },
    ],
  },
};

export function packMeta(pack: PackId) {
  return PACKS_META[pack];
}

const parsed = new Map<PackId, SourceFile[]>();

export function loadPack(pack: PackId): SourceFile[] {
  let base = parsed.get(pack);
  if (!base) {
    const folder = join(process.cwd(), "data", "packs", pack);
    base = packMeta(pack).files.map((entry) => {
      const table = parseCsv(readFileSync(join(folder, entry.file), "utf8"));
      const rows: SourceRow[] = table.map((cells, index) => ({
        file: entry.file,
        line: index + 2,
        cells,
      }));
      return { id: entry.file, file: entry.file, title: entry.title, rows };
    });
    parsed.set(pack, base);
  }
  return base;
}

export function copyPack(pack: PackId): SourceFile[] {
  return loadPack(pack).map((file) => ({
    ...file,
    rows: file.rows.map((row) => ({ ...row, cells: { ...row.cells } })),
  }));
}
