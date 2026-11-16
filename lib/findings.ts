import { nameOf } from "./picture";
import { monthKey, monthLabel, naira } from "./text";
import type { Finding, Picture, RowPreview, SourceFile } from "./types";

function preview(files: SourceFile[], file: string, line: number): RowPreview {
  const source = files.find((item) => item.file === file);
  const row = source?.rows.find((item) => item.line === line);
  const values = Object.values(row?.cells || {}).map((value) => value.trim()).filter(Boolean).slice(0, 6);
  return {
    file,
    title: source?.title || file,
    line,
    summary: values.join(", "),
  };
}

function pushUnique(list: RowPreview[], item: RowPreview) {
  if (list.some((row) => row.file === item.file && row.line === item.line)) return;
  if (list.length < 8) list.push(item);
}

export function buildFindings(picture: Picture, files: SourceFile[]): Finding[] {
  const findings: Finding[] = [];
  const branchName = (id: string) => nameOf(picture.branches, id);
  const productName = (id: string) => nameOf(picture.products, id);
  const staffName = (id: string) => nameOf(picture.staff, id);
  const customerName = (id: string) => nameOf(picture.customers, id);
  const accountName = (id: string) => nameOf(picture.accounts, id);

  const sold = new Map<string, number>();
  picture.sales.forEach((sale) => {
    const key = `${sale.branchId}|${sale.productId}`;
    sold.set(key, (sold.get(key) || 0) + sale.qty);
  });
  const sent = new Map<string, number>();
  const stockRows = new Map<string, Picture["stock"]>();
  picture.stock.forEach((move) => {
    const key = `${move.branchId}|${move.productId}`;
    sent.set(key, (sent.get(key) || 0) + move.sent);
    const rows = stockRows.get(key) || [];
    rows.push(move);
    stockRows.set(key, rows);
  });

  sent.forEach((sentQty, key) => {
    const soldQty = sold.get(key) || 0;
    const gap = sentQty - soldQty;
    if (gap < 40 || sentQty < soldQty * 1.15) return;
    const [branchId, productId] = key.split("|");
    const rows: RowPreview[] = [];
    (stockRows.get(key) || []).slice(0, 4).forEach((move) => {
      pushUnique(rows, preview(files, move.ref.file, move.ref.line));
    });
    picture.sales.filter((sale) => sale.branchId === branchId && sale.productId === productId).slice(0, 3).forEach((sale) => {
      pushUnique(rows, preview(files, sale.ref.file, sale.ref.line));
    });
    findings.push({
      id: `stock-${key}`,
      kind: "stock_gap",
      title: `${productName(productId)} at ${branchName(branchId)} is leaving faster than it is sold`,
      detail: `The stock sheet shows ${Math.round(gap).toLocaleString("en-GB")} more packs leaving than the sales records account for.`,
      reason: "What comes in, what is sold, and what is still on the shelf should agree. These packs left the sheet without a matching sale.",
      rows,
      nodes: [],
      links: [],
    });
  });

  const branchMonths = new Map<string, { cash: number; deposited: number; sales: Picture["sales"]; deposits: Picture["deposits"] }>();
  picture.sales.forEach((sale) => {
    if (!sale.date || !/cash/i.test(sale.pay)) return;
    const key = `${sale.branchId}|${monthKey(sale.date)}`;
    const bucket = branchMonths.get(key) || { cash: 0, deposited: 0, sales: [], deposits: [] };
    bucket.cash += sale.amount;
    bucket.sales.push(sale);
    branchMonths.set(key, bucket);
  });
  picture.deposits.forEach((deposit) => {
    if (!deposit.date) return;
    const key = `${deposit.branchId}|${monthKey(deposit.date)}`;
    const bucket = branchMonths.get(key) || { cash: 0, deposited: 0, sales: [], deposits: [] };
    bucket.deposited += deposit.amount;
    bucket.deposits.push(deposit);
    branchMonths.set(key, bucket);
  });
  branchMonths.forEach((bucket, key) => {
    const short = bucket.cash - bucket.deposited;
    if (bucket.cash < 200000 || bucket.deposited >= bucket.cash * 0.75 || short < 100000) return;
    const [branchId, month] = key.split("|");
    const rows: RowPreview[] = [];
    bucket.deposits.slice(0, 4).forEach((deposit) => pushUnique(rows, preview(files, deposit.ref.file, deposit.ref.line)));
    bucket.sales.slice(0, 3).forEach((sale) => pushUnique(rows, preview(files, sale.ref.file, sale.ref.line)));
    findings.push({
      id: `cash-${key}`,
      kind: "cash_gap",
      title: `${branchName(branchId)} deposited less cash than it recorded in ${monthLabel(month)}`,
      detail: `Cash sales were ${naira(bucket.cash)}. The bank shows ${naira(bucket.deposited)} deposited for that branch. The difference is ${naira(short)}.`,
      reason: "Cash taken in the shop should show up in the branch deposit. This month it does not.",
      rows,
      nodes: [],
      links: [],
    });
  });

  const byCashier = new Map<string, Picture["refunds"]>();
  picture.refunds.forEach((refund) => {
    const list = byCashier.get(refund.staffId) || [];
    list.push(refund);
    byCashier.set(refund.staffId, list);
  });
  byCashier.forEach((list, staffId) => {
    const total = list.reduce((sum, refund) => sum + refund.amount, 0);
    if (list.length < 10 || total < 200000) return;
    const byCustomer = new Map<string, Picture["refunds"]>();
    list.forEach((refund) => {
      const bucket = byCustomer.get(refund.customerId) || [];
      bucket.push(refund);
      byCustomer.set(refund.customerId, bucket);
    });
    const family = new Map<string, string[]>();
    byCustomer.forEach((_, customerId) => {
      const surname = customerName(customerId).split(" ").slice(-1)[0]?.toLowerCase() || "";
      if (!surname) return;
      const members = family.get(surname) || [];
      members.push(customerId);
      family.set(surname, members);
    });
    const linked = [...family.values()].sort((a, b) => b.length - a.length)[0] || [];
    if (linked.length < 4) return;
    const rows: RowPreview[] = [];
    list.slice(0, 6).forEach((refund) => pushUnique(rows, preview(files, refund.ref.file, refund.ref.line)));
    const center = staffId || "cashier";
    findings.push({
      id: `refund-${staffId}`,
      kind: "refund_ring",
      title: `${staffName(staffId)} at ${branchName(list[0].branchId)} is refunding one small group again and again`,
      detail: `${list.length} refunds, together ${naira(total)}, went to ${linked.length} customers who share the name ${customerName(linked[0]).split(" ").slice(-1)[0]}.`,
      reason: "A refund now and then is normal. This many, to the same small group, is not.",
      rows,
      nodes: [
        { id: center, label: staffName(staffId), place: "center" },
        ...linked.map((customerId) => ({ id: customerId, label: customerName(customerId), place: "around" as const })),
      ],
      links: linked.map((customerId) => ({ from: center, to: customerId, label: "Refund" })),
    });
  });

  const latest = new Map<string, Picture["stock"][number]>();
  picture.stock.forEach((move) => {
    if (!move.date) return;
    const key = `${move.branchId}|${move.productId}`;
    const current = latest.get(key);
    if (!current || move.date > current.date) latest.set(key, move);
  });
  const october = new Map<string, number>();
  picture.sales.forEach((sale) => {
    if (monthKey(sale.date) !== "2026-10") return;
    const key = `${sale.branchId}|${sale.productId}`;
    october.set(key, (october.get(key) || 0) + sale.qty);
  });
  const runningOut: { key: string; days: number; onHand: number }[] = [];
  latest.forEach((move, key) => {
    const qty = october.get(key) || 0;
    if (qty < 20) return;
    const days = move.onHand / (qty / 30);
    if (days <= 14) runningOut.push({ key, days, onHand: move.onHand });
  });
  if (runningOut.length) {
    const rows: RowPreview[] = [];
    const names = runningOut.map((item) => {
      const [branchId, productId] = item.key.split("|");
      const move = latest.get(item.key)!;
      pushUnique(rows, preview(files, move.ref.file, move.ref.line));
      return `${productName(productId)} at ${branchName(branchId)} (${Math.max(1, Math.round(item.days))} days of stock)`;
    });
    findings.push({
      id: "stockouts",
      kind: "stockout",
      title: runningOut.length === 1 ? `${names[0].split(" (")[0]} is about to run out` : `${runningOut.length} items are about to run out`,
      detail: names.join(". ") + ".",
      reason: "Recent sales are still moving, and the shelf count will not last two weeks.",
      rows,
      nodes: [],
      links: [],
    });
  }

  const purchases = new Map<string, string[]>();
  picture.sales.forEach((sale) => {
    if (!sale.customerId || !sale.date) return;
    const dates = purchases.get(sale.customerId) || [];
    dates.push(sale.date);
    purchases.set(sale.customerId, dates);
  });
  const quiet: string[] = [];
  purchases.forEach((dates, customerId) => {
    const sorted = [...new Set(dates)].sort();
    const before = sorted.filter((date) => date < "2026-09-01");
    const after = sorted.filter((date) => date >= "2026-09-01");
    if (before.length < 12 || after.length || !before.some((date) => date >= "2026-08-01")) return;
    const gaps: number[] = [];
    for (let i = 1; i < before.length; i++) {
      gaps.push((Date.parse(before[i]) - Date.parse(before[i - 1])) / 86400000);
    }
    gaps.sort((a, b) => a - b);
    const median = gaps[Math.floor(gaps.length / 2)] || 99;
    const widest = gaps[gaps.length - 1] || 99;
    if (median <= 14 && widest <= 18) quiet.push(customerId);
  });
  if (quiet.length) {
    const rows: RowPreview[] = [];
    quiet.slice(0, 6).forEach((customerId) => {
      const sale = picture.sales.find((item) => item.customerId === customerId);
      if (sale) pushUnique(rows, preview(files, sale.ref.file, sale.ref.line));
    });
    const sample = quiet.slice(0, 4).map((customerId) => customerName(customerId)).join(", ");
    findings.push({
      id: "churn",
      kind: "churn",
      title: `${quiet.length} regular customers have gone quiet`,
      detail: `They used to buy about every two weeks, and none of them has bought since the start of September. Among them: ${sample}.`,
      reason: "A regular buyer who suddenly stops is easier to win back this month than next month.",
      rows,
      nodes: [],
      links: [],
    });
  }

  picture.branches.forEach((branch) => {
    const august = picture.sales.filter((sale) => sale.branchId === branch.id && monthKey(sale.date) === "2026-08").reduce((sum, sale) => sum + sale.amount, 0);
    const september = picture.sales.filter((sale) => sale.branchId === branch.id && monthKey(sale.date) === "2026-09").reduce((sum, sale) => sum + sale.amount, 0);
    if (august < 100000 || september >= august * 0.88) return;
    const drop = Math.round((1 - september / august) * 100);
    findings.push({
      id: `drop-${branch.id}`,
      kind: "sales_drop",
      title: `${branch.name} sold ${drop}% less in September than in August`,
      detail: `August sales were ${naira(august)}. September sales were ${naira(september)}.`,
      reason: "The drop is large enough to ask what else was going on at that branch in the same month.",
      rows: [],
      nodes: [],
      links: [],
    });
  });

  const big = picture.transfers.filter((transfer) => transfer.amount >= 100000 && transfer.fromId && transfer.toId);
  const graph = new Map<string, { to: string; transfer: Picture["transfers"][number] }[]>();
  big.forEach((transfer) => {
    const list = graph.get(transfer.fromId) || [];
    list.push({ to: transfer.toId, transfer });
    graph.set(transfer.fromId, list);
  });
  const cycles: string[][] = [];
  const visit = (start: string, current: string, path: string[]) => {
    if (path.length > 6) return;
    const nexts = graph.get(current) || [];
    for (const edge of nexts) {
      if (edge.to === start && path.length >= 4) {
        cycles.push([...path]);
        return;
      }
      if (path.includes(edge.to)) continue;
      visit(start, edge.to, [...path, edge.to]);
    }
  };
  [...graph.keys()].forEach((start) => visit(start, start, [start]));
  const cycle = cycles.sort((a, b) => b.length - a.length)[0];
  if (cycle) {
    const rows: RowPreview[] = [];
    const links = cycle.map((from, index) => {
      const to = cycle[(index + 1) % cycle.length];
      const transfer = big.find((item) => item.fromId === from && item.toId === to);
      if (transfer) pushUnique(rows, preview(files, transfer.ref.file, transfer.ref.line));
      return { from, to, label: transfer ? naira(transfer.amount) : "Transfer" };
    });
    findings.push({
      id: "ring",
      kind: "fraud_ring",
      title: "The same money is moving in a circle",
      detail: `${cycle.length} accounts send large sums to one another and the money comes back to where it started.`,
      reason: "Ordinary customers pay a shop or a person once. A circle of large transfers, days apart, is worth a closer look.",
      rows,
      nodes: cycle.map((id, index) => ({ id, label: accountName(id), place: index === 0 ? "center" as const : "around" as const })),
      links,
    });
  }

  const incoming = new Map<string, Picture["transfers"]>();
  picture.transfers.forEach((transfer) => {
    if (transfer.amount < 50000) return;
    const list = incoming.get(transfer.toId) || [];
    list.push(transfer);
    incoming.set(transfer.toId, list);
  });
  incoming.forEach((list, accountId) => {
    const dates = list.map((transfer) => transfer.date).sort();
    if (!dates.length) return;
    const window = list.filter((transfer) => transfer.date >= dates[0] && transfer.date <= addDays(dates[0], 3));
    const senders = new Set(window.map((transfer) => transfer.fromId));
    if (senders.size < 5) return;
    const inflow = window.reduce((sum, transfer) => sum + transfer.amount, 0);
    const last = window.map((transfer) => transfer.date).sort().slice(-1)[0];
    const onward = picture.transfers.find((transfer) => transfer.fromId === accountId && transfer.date >= last && transfer.date <= addDays(last, 2) && transfer.amount >= inflow * 0.7);
    if (!onward) return;
    const rows: RowPreview[] = [];
    window.slice(0, 5).forEach((transfer) => pushUnique(rows, preview(files, transfer.ref.file, transfer.ref.line)));
    pushUnique(rows, preview(files, onward.ref.file, onward.ref.line));
    findings.push({
      id: `mule-${accountId}`,
      kind: "mule",
      title: `${accountName(accountId)} received money from many people and sent it on`,
      detail: `${senders.size} payments came in over a few days, then ${naira(onward.amount)} left for ${accountName(onward.toId)}.`,
      reason: "Money that arrives from many people and leaves almost at once is a common way of hiding where it came from.",
      rows,
      nodes: [
        { id: accountId, label: accountName(accountId), place: "center" },
        ...[...senders].slice(0, 6).map((id) => ({ id, label: accountName(id), place: "around" as const })),
        { id: onward.toId, label: accountName(onward.toId), place: "around" },
      ],
      links: [
        ...[...senders].slice(0, 6).map((id) => ({ from: id, to: accountId, label: "Paid in" })),
        { from: accountId, to: onward.toId, label: "Sent on" },
      ],
    });
  });

  return findings;
}

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function alsoNoticed(picture: Picture): string[] {
  const notes: string[] = [];
  if (picture.duplicateSales) {
    notes.push(`${picture.duplicateSales} sales were entered twice. Cognosco kept one of each.`);
  }
  if (picture.unmatchedRefs) {
    notes.push(`${picture.unmatchedRefs} bank references do not match any receipt.`);
  }
  const moved = picture.staff.filter((person) => person.extra.includes("moved"));
  return notes.concat(moved.map((person) => `${person.name} has worked at more than one branch.`));
}
