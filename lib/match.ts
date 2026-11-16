import { cell } from "./mapping";
import { displayName, jaroWinkler, normItem, normName, normPhone, normPlace, sameTokens } from "./text";
import type { ColumnChoice, Entity, SourceFile, SourceRow } from "./types";

class UnionFind {
  parent: number[];
  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, index) => index);
  }
  find(index: number): number {
    let current = index;
    while (this.parent[current] !== current) {
      this.parent[current] = this.parent[this.parent[current]];
      current = this.parent[current];
    }
    return current;
  }
  union(left: number, right: number) {
    const a = this.find(left);
    const b = this.find(right);
    if (a !== b) this.parent[b] = a;
  }
}

type Named = { index: number; row: SourceRow; raw: string; norm: string; phone: string };

function rowsWith(files: SourceFile[], choices: ColumnChoice[], meaning: ColumnChoice["meaning"]): Named[] {
  const named: Named[] = [];
  for (const file of files) {
    if (!choices.some((choice) => choice.file === file.file && choice.meaning === meaning)) continue;
    file.rows.forEach((row, index) => {
      const raw = cell(row, choices, meaning).trim();
      if (!raw) return;
      named.push({
        index: named.length,
        row,
        raw,
        norm: meaning === "product" ? normItem(raw) : meaning === "branch" ? normPlace(raw) : normName(raw),
        phone: normPhone(cell(row, choices, "phone")),
      });
    });
  }
  return named;
}

function preferredName(members: Named[]): string {
  const counts = new Map<string, number>();
  members.forEach((member) => {
    const raw = member.raw.trim().replace(/\s+/g, " ").replace(/^Mr\s+/i, "");
    const name = raw === raw.toUpperCase() ? displayName(raw) : raw;
    counts.set(name, (counts.get(name) || 0) + 1);
  });
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0]?.[1] || 0;
  const candidates = ranked.filter(([, count]) => count >= top * 0.4);
  candidates.sort((a, b) => b[0].length - a[0].length);
  return candidates[0]?.[0] || "Unknown";
}

function entitiesFrom(kind: Entity["kind"], groups: Named[][], prefix: string): { entities: Entity[]; rowKey: Map<string, string> } {
  const entities: Entity[] = [];
  const rowKey = new Map<string, string>();
  groups.forEach((members, index) => {
    const id = `${prefix}${index + 1}`;
    const phones = [...new Set(members.map((member) => member.phone).filter(Boolean))];
    entities.push({ id, kind, name: preferredName(members), extra: phones });
    members.forEach((member) => rowKey.set(`${member.row.file}:${member.row.line}:${kind}:${member.norm}`, id));
  });
  return { entities, rowKey };
}

export type MatchReport = {
  customers: Entity[];
  products: Entity[];
  branches: Entity[];
  staff: Entity[];
  accounts: Entity[];
  ids: Map<string, string>;
  uncertain: { id: string; left: string; right: string; because: string; leftRef: string; rightRef: string }[];
  rawCustomerRows: number;
};

function groupExact(items: Named[], keyOf: (item: Named) => string): UnionFind {
  const sets = new UnionFind(items.length);
  const buckets = new Map<string, number[]>();
  items.forEach((item, index) => {
    const key = keyOf(item);
    if (!key) return;
    const bucket = buckets.get(key) || [];
    bucket.push(index);
    buckets.set(key, bucket);
  });
  buckets.forEach((indexes) => {
    for (let i = 1; i < indexes.length; i++) sets.union(indexes[0], indexes[i]);
  });
  return sets;
}

function clusterPlaces(items: Named[]): Named[][] {
  const unique = new Map<string, number>();
  items.forEach((item, index) => {
    if (!unique.has(item.norm)) unique.set(item.norm, index);
  });
  const keys = [...unique.keys()];
  const sets = groupExact(items, (item) => item.norm);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      if (!sameTokens(keys[i], keys[j])) continue;
      sets.union(unique.get(keys[i])!, unique.get(keys[j])!);
    }
  }
  return collect(items, sets);
}

function collect(items: Named[], sets: UnionFind): Named[][] {
  const groups = new Map<number, Named[]>();
  items.forEach((item, index) => {
    const root = sets.find(index);
    const group = groups.get(root) || [];
    group.push(item);
    groups.set(root, group);
  });
  return [...groups.values()];
}

export function matchRecords(files: SourceFile[], choices: ColumnChoice[], splits: string[]): MatchReport {
  const customers = rowsWith(files, choices, "customer");
  const products = rowsWith(files, choices, "product");
  const branches = rowsWith(files, choices, "branch");
  const staff = rowsWith(files, choices, "staff");
  const accounts = rowsWith(files, choices, "account");
  const fromAccounts = rowsWith(files, choices, "from_account");
  const toAccounts = rowsWith(files, choices, "to_account");

  const customerSets = groupExact(customers, (item) => item.phone);
  const byName = new Map<string, number[]>();
  customers.forEach((item, index) => {
    if (!item.norm) return;
    const bucket = byName.get(item.norm) || [];
    bucket.push(index);
    byName.set(item.norm, bucket);
  });
  byName.forEach((indexes) => {
    const phones = new Set(indexes.map((index) => customers[index].phone).filter(Boolean));
    if (phones.size > 1) return;
    for (let i = 1; i < indexes.length; i++) customerSets.union(indexes[0], indexes[i]);
  });

  const uncertain: MatchReport["uncertain"] = [];
  const seenPairs = new Set<string>();
  const byFirst = new Map<string, number[]>();
  customers.forEach((item, index) => {
    const first = item.norm.split(" ")[0];
    if (!first) return;
    const bucket = byFirst.get(first) || [];
    if (bucket.length < 80) bucket.push(index);
    byFirst.set(first, bucket);
  });
  byFirst.forEach((indexes) => {
    const norms = new Map<string, number>();
    indexes.forEach((index) => {
      const norm = customers[index].norm;
      if (!norms.has(norm)) norms.set(norm, index);
    });
    const reps = [...norms.entries()];
    for (let i = 0; i < reps.length; i++) {
      for (let j = i + 1; j < reps.length; j++) {
        const score = jaroWinkler(reps[i][0], reps[j][0]);
        if (score < 0.96) continue;
        const left = customers[reps[i][1]];
        const right = customers[reps[j][1]];
        if (left.phone && right.phone && left.phone !== right.phone) continue;
        if (customerSets.find(left.index) === customerSets.find(right.index)) continue;
        const id = `${left.norm}|${right.norm}`;
        if (seenPairs.has(id)) continue;
        seenPairs.add(id);
        if (!splits.includes(id)) customerSets.union(left.index, right.index);
        uncertain.push({
          id,
          left: displayName(left.raw),
          right: displayName(right.raw),
          because: "The names are almost the same, and one row has no phone number.",
          leftRef: `${left.row.file}:${left.row.line}`,
          rightRef: `${right.row.file}:${right.row.line}`,
        });
      }
    }
  });

  const accountItems = [...accounts, ...fromAccounts, ...toAccounts].map((item, index) => ({
    ...item,
    index,
    norm: item.raw.replace(/\D/g, "") || item.raw,
  }));
  const accountSets = groupExact(accountItems, (item) => item.norm);

  const builtCustomers = entitiesFrom("customer", collect(customers, customerSets), "c");
  const builtProducts = entitiesFrom("product", clusterPlaces(products.map((item) => ({ ...item, norm: normItem(item.raw) }))), "g");
  const builtBranches = entitiesFrom("branch", clusterPlaces(branches), "b");
  const builtStaff = entitiesFrom("staff", collect(staff, groupExact(staff, (item) => item.norm)), "s");
  const builtAccounts = entitiesFrom("account", collect(accountItems, accountSets), "a");

  const ids = new Map<string, string>();
  [builtCustomers, builtProducts, builtBranches, builtStaff, builtAccounts].forEach((built) => {
    built.rowKey.forEach((id, key) => ids.set(key, id));
  });

  return {
    customers: builtCustomers.entities,
    products: builtProducts.entities,
    branches: builtBranches.entities,
    staff: builtStaff.entities,
    accounts: builtAccounts.entities,
    ids,
    uncertain: uncertain.slice(0, 12),
    rawCustomerRows: customers.length,
  };
}

export function idFor(ids: Map<string, string>, row: SourceRow, kind: Entity["kind"], norm: string): string {
  return ids.get(`${row.file}:${row.line}:${kind}:${norm}`) || "";
}
