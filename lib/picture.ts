import { idFor, matchRecords } from "./match";
import { displayName, monthKey, normItem, normName, normPhone, normPlace, numberFrom } from "./text";
import type { ColumnChoice, Deposit, Entity, Picture, Refund, Sale, SourceFile, StockMove, Transfer } from "./types";

function byId(list: Entity[]): Map<string, Entity> {
  return new Map(list.map((item) => [item.id, item]));
}

export function buildPicture(files: SourceFile[], choices: ColumnChoice[], splits: string[], business: string, asOf: string, pack: Picture["pack"]): Picture {
  const match = matchRecords(files, choices, splits);
  const customers = byId(match.customers);
  const accounts = match.accounts.map((account) => ({ ...account }));
  const columnFor = new Map<string, Map<string, string>>();
  choices.forEach((choice) => {
    const columns = columnFor.get(choice.file) || new Map<string, string>();
    if (!columns.has(choice.meaning)) columns.set(choice.meaning, choice.column);
    columnFor.set(choice.file, columns);
  });
  const read = (row: SourceFile["rows"][number], meaning: string) => row.cells[columnFor.get(row.file)?.get(meaning) || ""] || "";

  const sales: Sale[] = [];
  const stock: StockMove[] = [];
  const refunds: Refund[] = [];
  const deposits: Deposit[] = [];
  const transfers: Transfer[] = [];
  const seenReceipts = new Set<string>();
  let duplicateSales = 0;
  const receiptIds = new Set<string>();

  for (const file of files) {
    for (const row of file.rows) {
      const customerName = read(row, "customer");
      const customerId = customerName ? idFor(match.ids, row, "customer", normName(customerName)) : "";
      const productName = read(row, "product");
      const productId = productName ? idFor(match.ids, row, "product", normItem(productName)) : "";
      const branchName = read(row, "branch");
      const branchId = branchName ? idFor(match.ids, row, "branch", normPlace(branchName)) : "";
      const staffName = read(row, "staff");
      const staffId = staffName ? idFor(match.ids, row, "staff", normName(staffName)) : "";
      const accountRaw = read(row, "account");
      const accountId = accountRaw ? idFor(match.ids, row, "account", accountRaw.replace(/\D/g, "") || accountRaw) : "";
      if (accountId && customerId && customers.get(customerId)) {
        const account = accounts.find((item) => item.id === accountId);
        if (account) account.name = customers.get(customerId)!.name;
      }

      const date = read(row, "date").slice(0, 10);
      const qty = numberFrom(read(row, "qty"));
      const amount = numberFrom(read(row, "amount"));
      const receipt = read(row, "receipt").trim();
      if (qty > 0 && productId && branchId && !read(row, "refund")) {
        if (receipt) receiptIds.add(receipt);
        const key = `${receipt}|${productId}|${qty}|${amount}|${date}`;
        if (receipt && seenReceipts.has(key)) {
          duplicateSales += 1;
          continue;
        }
        if (receipt) seenReceipts.add(key);
        sales.push({
          ref: { file: row.file, line: row.line },
          date,
          branchId,
          productId,
          customerId,
          staffId,
          qty,
          amount: amount || qty * numberFrom(read(row, "unit_price")),
          pay: read(row, "pay_type"),
          receipt,
        });
      }

      const received = numberFrom(read(row, "qty_in"));
      const sent = numberFrom(read(row, "qty_out"));
      const onHand = numberFrom(read(row, "on_hand"));
      if ((received || sent || onHand) && productId && branchId && read(row, "on_hand")) {
        stock.push({ ref: { file: row.file, line: row.line }, date, branchId, productId, received, sent, onHand });
      }

      const refund = read(row, "refund").trim().toLowerCase();
      if (refund === "yes" || refund === "y" || refund === "true") {
        refunds.push({
          ref: { file: row.file, line: row.line },
          date,
          branchId,
          customerId,
          staffId,
          amount: amount || numberFrom(read(row, "credit")),
        });
      }

      const credit = numberFrom(read(row, "credit"));
      if (credit > 0 && branchId) {
        deposits.push({
          ref: { file: row.file, line: row.line },
          date,
          branchId,
          amount: credit,
          reference: read(row, "reference"),
          narration: read(row, "narration"),
        });
      }

      const fromRaw = read(row, "from_account");
      const toRaw = read(row, "to_account");
      if (fromRaw && toRaw) {
        const fromId = idFor(match.ids, row, "account", fromRaw.replace(/\D/g, "") || fromRaw);
        const toId = idFor(match.ids, row, "account", toRaw.replace(/\D/g, "") || toRaw);
        transfers.push({
          ref: { file: row.file, line: row.line },
          date,
          fromId,
          toId,
          amount: amount,
          channel: read(row, "channel"),
          narration: read(row, "narration"),
        });
      }
    }
  }

  const unmatchedRefs = deposits.filter((deposit) => deposit.reference.startsWith("RCPT-") && !receiptIds.has(deposit.reference.replace("RCPT-", "R")) && !receiptIds.has(deposit.reference)).length;

  return {
    pack,
    business,
    asOf,
    files: files.map((file) => ({ file: file.file, title: file.title, rows: file.rows.length })),
    customers: match.customers,
    products: match.products,
    branches: match.branches,
    staff: match.staff,
    accounts,
    sales,
    stock,
    refunds,
    deposits,
    transfers,
    duplicateSales,
    unmatchedRefs,
    rawCustomerRows: match.rawCustomerRows,
    uncertain: match.uncertain.map((item) => ({
      id: item.id,
      left: item.left,
      right: item.right,
      because: item.because,
    })),
  };
}

export function nameOf(list: Entity[], id: string): string {
  return list.find((item) => item.id === id)?.name || "Unknown";
}

export function salesInMonth(picture: Picture, branchId: string, month: string): number {
  return picture.sales
    .filter((sale) => sale.branchId === branchId && monthKey(sale.date) === month)
    .reduce((sum, sale) => sum + sale.amount, 0);
}
