/**
 * Builds the sample files Cognosco reads.
 * Every problem the demo must catch is planted here, then scored from truth.json.
 * People, shops, and amounts are fictional.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "data", "packs");

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(20261114);
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
function useSeed(seed) {
  rand = mulberry32(seed);
}

const FIRST = [
  "Chinedu", "Adaeze", "Tunde", "Amina", "Ibrahim", "Fatima", "Chika", "Ngozi",
  "Emeka", "Olumide", "Yetunde", "Musa", "Blessing", "Kelechi", "Halima", "Segun",
  "Zainab", "Ifeanyi", "Bola", "Chisom", "Abdullahi", "Maryam", "Kunle", "Nneka",
  "Yusuf", "Funmilayo", "Obinna", "Aisha", "Femi", "Chioma", "Sani", "Hadiza",
  "Tobi", "Amaka", "Garba", "Ruth", "Ebuka", "Laraba", "Dayo", "Omolara",
];
const LAST = [
  "Adeyemi", "Okonkwo", "Bello", "Nwosu", "Okafor", "Abdullahi", "Ogunleye", "Eze",
  "Mohammed", "Adebayo", "Okeke", "Lawal", "Chukwu", "Suleiman", "Ojo", "Ibrahim",
  "Nwachukwu", "Danjuma", "Adewale", "Okorie", "Babatunde", "Musa", "Obi", "Garba",
  "Akinyemi", "Umeh", "Yusuf", "Oladipo", "Nwankwo", "Danjuma",
];

let BRANCHES = [
  { id: "ikeja", name: "Ikeja", city: "Lagos", variants: ["Ikeja", "Ikeja Central"] },
  { id: "surulere", name: "Surulere", city: "Lagos", variants: ["Surulere", "Surulere Shop"] },
  { id: "yaba", name: "Yaba", city: "Lagos", variants: ["Yaba", "Yaba Branch"] },
  { id: "lekki", name: "Lekki", city: "Lagos", variants: ["Lekki", "Lekki Phase 1"] },
  { id: "bodija", name: "Bodija", city: "Ibadan", variants: ["Bodija", "Ibadan Bodija"] },
  { id: "gra", name: "GRA Port Harcourt", city: "Port Harcourt", variants: ["GRA Port Harcourt", "Port Harcourt GRA"] },
  { id: "wuse", name: "Wuse", city: "Abuja", variants: ["Wuse", "Wuse Market", "Wuse Mkt"] },
  { id: "garki", name: "Garki", city: "Abuja", variants: ["Garki", "Garki II"] },
  { id: "kano", name: "Sabon Gari", city: "Kano", variants: ["Sabon Gari", "Kano Sabon Gari"] },
  { id: "enugu", name: "Independence Layout", city: "Enugu", variants: ["Independence Layout", "Independence Layout Enugu"] },
  { id: "benin", name: "Ring Road", city: "Benin City", variants: ["Ring Road", "Benin Ring Road"] },
  { id: "kaduna", name: "Barnawa", city: "Kaduna", variants: ["Barnawa", "Kaduna Barnawa"] },
];

let PRODUCTS = [
  { id: "amox", name: "Amoxicillin 500mg", price: 850, base: 46, variants: ["Amoxicillin 500mg", "Amoxicillin 500 mg", "Amoxicillin 500mg capsules"] },
  { id: "para", name: "Paracetamol 500mg", price: 200, base: 90, variants: ["Paracetamol 500mg", "Paracetamol 500 mg", "Paracetamol 500mg tablets"] },
  { id: "ors", name: "ORS sachets", price: 150, base: 70, variants: ["ORS sachets", "ORS sachet"] },
  { id: "vitc", name: "Vitamin C 1000mg", price: 1200, base: 36, variants: ["Vitamin C 1000mg", "Vitamin C 1000 mg"] },
  { id: "cough", name: "Cough syrup 100ml", price: 1800, base: 22, variants: ["Cough syrup 100ml", "Cough syrup 100 ml"] },
  { id: "anti", name: "Antimalarial pack", price: 2500, base: 28, variants: ["Antimalarial pack", "Antimalarial packs"] },
  { id: "bp", name: "Blood pressure tablets", price: 3200, base: 18, variants: ["Blood pressure tablets", "Blood pressure tablet"] },
  { id: "zinc", name: "Zinc tablets", price: 600, base: 30, variants: ["Zinc tablets", "Zinc tablet"] },
  { id: "bandage", name: "Cotton bandage", price: 400, base: 24, variants: ["Cotton bandage", "Cotton bandages"] },
  { id: "soap", name: "Medicated soap", price: 750, base: 40, variants: ["Medicated soap", "Medicated soaps"] },
  { id: "dettol", name: "Antiseptic liquid 250ml", price: 2100, base: 16, variants: ["Antiseptic liquid 250ml", "Antiseptic liquid 250 ml"] },
  { id: "milk", name: "Powdered milk 400g", price: 4800, base: 20, variants: ["Powdered milk 400g", "Powdered milk 400 g"] },
  { id: "rice", name: "Rice 5kg", price: 12500, base: 14, variants: ["Rice 5kg", "Rice 5 kg"] },
  { id: "oil", name: "Vegetable oil 1L", price: 2800, base: 26, variants: ["Vegetable oil 1L", "Vegetable oil 1 litre"] },
  { id: "detergent", name: "Detergent 900g", price: 1600, base: 32, variants: ["Detergent 900g", "Detergent 900 g"] },
  { id: "water", name: "Bottled water pack", price: 1800, base: 48, variants: ["Bottled water pack", "Bottled water packs"] },
];

const MONTHS = [];
for (let i = 0; i < 12; i++) {
  const d = new Date(Date.UTC(2025, 10 + i, 1));
  MONTHS.push({
    key: d.toISOString().slice(0, 7),
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
  });
}

function iso(year, month, day) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function daysIn(year, month) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function writeCsv(dir, name, headers, rows) {
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  });
  writeFileSync(join(dir, name), lines.join("\n") + "\n");
}

let SHOP = {
  pack: "pharmacy",
  business: "Balogun Pharmacy and Stores",
  dropBranch: "wuse",
  leakProduct: "amox",
  busyBranch: "lekki",
  cashBranch: "garki",
  refundBranch: "surulere",
  refundCashier: "Adaeze Nwosu",
  moverFrom: "yaba",
  moverTo: "lekki",
  moverFromName: "Yaba",
  regularProduct: "para",
  outs: [
    { branch: "kano", product: "ors", floor: 60, boost: 1.4 },
    { branch: "lekki", product: "vitc", floor: 40, boost: 1 },
    { branch: "bodija", product: "milk", floor: 36, boost: 1 },
  ],
};

function fullName(person) {
  return [person.first, person.middle, person.last].filter(Boolean).join(" ");
}

function personName(person, style) {
  const name = fullName(person);
  if (style === "title") return `Mr ${name}`;
  if (style === "space") return name.replace(" ", "  ");
  if (style === "case") return name.toUpperCase();
  if (style === "typo") {
    const last = person.last.length > 2 ? person.last.slice(0, -1) : person.last;
    return [person.first, person.middle, last].filter(Boolean).join(" ");
  }
  return name;
}

function makePeople(count, phoneStart) {
  const people = [];
  const used = new Set();
  for (let i = 0; i < count; i++) {
    let first = FIRST[i % FIRST.length];
    let last = LAST[Math.floor(i / FIRST.length) % LAST.length];
    let middle = "";
    let attempt = 0;
    let name = `${first} ${last}`.toLowerCase();
    while (used.has(name) && attempt < 80) {
      attempt += 1;
      middle = FIRST[(i + attempt + 5) % FIRST.length];
      if (middle === first) middle = FIRST[(i + attempt + 6) % FIRST.length];
      name = `${first} ${middle} ${last}`.toLowerCase();
    }
    used.add(name);
    const phone = `080${String(phoneStart + i).padStart(8, "0").slice(-8)}`;
    people.push({
      id: `p${i + 1}`,
      first,
      middle,
      last,
      phone,
      branchId: BRANCHES[i % BRANCHES.length].id,
    });
  }
  return people;
}

function buildPharmacy() {
  const people = makePeople(1680, 22000000);
  const churnIds = new Set(people.slice(0, 36).map((person) => person.id));
  const cashiers = [
    { id: "adaeze", name: SHOP.refundCashier, branchId: SHOP.refundBranch, role: "Cashier" },
    { id: "tunde", name: "Tunde Bakare", branchId: SHOP.moverTo, previous: SHOP.moverFromName, role: "Cashier", moved: "2026-04-01" },
    { id: "ibrahim", name: "Ibrahim Sule", branchId: "wuse", role: "Cashier" },
    { id: "fatima", name: "Fatima Bello", branchId: "garki", role: "Cashier" },
    { id: "ngozi", name: "Ngozi Eze", branchId: "ikeja", role: "Cashier" },
    { id: "segun", name: "Segun Adewale", branchId: "yaba", role: "Cashier" },
    { id: "maryam", name: "Maryam Lawal", branchId: "kano", role: "Cashier" },
    { id: "kelechi", name: "Kelechi Okeke", branchId: "enugu", role: "Cashier" },
    { id: "bola", name: "Bola Ojo", branchId: "lekki", role: "Cashier" },
    { id: "musa", name: "Musa Danjuma", branchId: "kaduna", role: "Cashier" },
    { id: "ruth", name: "Ruth Ogunleye", branchId: "bodija", role: "Cashier" },
    { id: "chika", name: "Chika Obi", branchId: "benin", role: "Cashier" },
    { id: "halima", name: "Halima Yusuf", branchId: "gra", role: "Cashier" },
    { id: "femi", name: "Femi Adebayo", branchId: "ikeja", role: "Cashier" },
  ];
  const managers = BRANCHES.map((branch, index) => ({
    id: `mgr-${branch.id}`,
    name: `${FIRST[(index + 7) % FIRST.length]} ${LAST[(index + 4) % LAST.length]}`,
    branchId: branch.id,
    role: "Manager",
  }));

  const refundCustomers = [
    { id: "okoye1", first: "Ifeanyi", last: "Okoye", phone: "08055501001" },
    { id: "okoye2", first: "Ngozi", last: "Okoye", phone: "08055501002" },
    { id: "okoye3", first: "Chika", last: "Okoye", phone: "08055501003" },
    { id: "okoye4", first: "Obinna", last: "Okoye", phone: "08055501004" },
    { id: "okoye5", first: "Amaka", last: "Okoye", phone: "08055501005" },
    { id: "okoye6", first: "Ebuka", last: "Okoye", phone: "08055501006" },
  ].map((person) => ({ ...person, branchId: SHOP.refundBranch }));

  const sales = [];
  const pos = [];
  const stock = [];
  const bank = [];
  const groups = {
    customer: {},
    product: {},
    branch: {},
    staff: {},
  };
  const remember = (kind, key, ref) => {
    if (!groups[kind][key]) groups[kind][key] = [];
    groups[kind][key].push(ref);
  };

  const branchById = Object.fromEntries(BRANCHES.map((branch) => [branch.id, branch]));
  const productById = Object.fromEntries(PRODUCTS.map((product) => [product.id, product]));
  const cashByBranchMonth = {};
  const soldByKey = {};

  let receiptNo = 10000;
  people.forEach((person) => remember("customer", person.id, null));

  for (const month of MONTHS) {
    for (const branch of BRANCHES) {
      const localPeople = people.filter((person) => person.branchId === branch.id && !churnIds.has(person.id));
      for (const product of PRODUCTS) {
        let qty = Math.round(product.base * (0.75 + rand() * 0.5));
        if (branch.id === SHOP.dropBranch && month.key === "2026-09") qty = Math.round(qty * 0.82);
        if (branch.id === SHOP.busyBranch) qty = Math.round(qty * 1.15);
        const hot = SHOP.outs.find((item) => item.branch === branch.id && item.product === product.id);
        if (hot && hot.boost > 1) qty = Math.round(qty * hot.boost);
        if (month.key === "2026-10" && hot) qty = Math.max(qty, hot.floor);
        const lines = Math.max(4, Math.round(qty / 2));
        let left = qty;
        for (let n = 0; n < lines && left > 0; n++) {
          const lineQty = n === lines - 1 ? left : Math.min(left, int(1, 3));
          left -= lineQty;
          const day = int(1, daysIn(month.year, month.month));
          if (month.key === "2026-10" && day > 28) continue;
          const date = iso(month.year, month.month, day);
          const person = pick(localPeople);
          const style = chance(0.22) ? pick(["title", "space", "case"]) : "plain";
          const phoneMissing = chance(0.18);
          const pay = chance(0.46) ? "Cash" : chance(0.5) ? "Card" : "Transfer";
          const cashierPool = cashiers.filter((cashier) => {
            if (cashier.id === "tunde") {
              return date < "2026-04-01" ? branch.id === SHOP.moverFrom : branch.id === SHOP.moverTo;
            }
            return cashier.branchId === branch.id;
          });
          const cashier = cashierPool.length ? pick(cashierPool) : pick(cashiers);
          const total = lineQty * product.price;
          const receipt = `R${receiptNo++}`;
          const row = {
            Txn_Dt: date,
            Brnch: pick(branch.variants),
            Prod_Nm: pick(product.variants),
            Qty_Out: lineQty,
            Unit_Amt: product.price,
            Line_Total: total,
            Cust_Nm: personName(person, style),
            Phone_No: phoneMissing ? "" : person.phone,
            Cashier: cashier.name,
            Pay_Mtd: pay,
            Rcpt: receipt,
          };
          sales.push(row);
          const ref = `sales:${sales.length}`;
          remember("customer", person.id, ref);
          remember("product", product.id, ref);
          remember("branch", branch.id, ref);
          remember("staff", cashier.id, ref);
          const soldKey = `${branch.id}|${product.id}|${month.key}`;
          soldByKey[soldKey] = (soldByKey[soldKey] || 0) + lineQty;
          if (pay === "Cash") {
            const cashKey = `${branch.id}|${month.key}`;
            cashByBranchMonth[cashKey] = (cashByBranchMonth[cashKey] || 0) + total;
          }
          if (pay !== "Cash") {
            pos.push({
              Sale_Date: date,
              Outlet: pick(branch.variants),
              Tender: pay,
              Amt: total,
              Is_Refund: "No",
              Customer_Name: personName(person, "plain"),
              Cashier_Name: cashier.name,
              Pos_Ref: `P${receipt}`,
            });
          }
          if (chance(0.012)) {
            sales.push({ ...row, Cust_Nm: personName(person, "case") });
            const dupRef = `sales:${sales.length}`;
            remember("customer", person.id, dupRef);
          }
          if (sales.length <= 8) {
            sales.push({ ...row, Cust_Nm: personName(person, "typo"), Phone_No: "", Rcpt: `R${receiptNo++}` });
            const typoRef = `sales:${sales.length}`;
            remember("customer", person.id, typoRef);
          }
        }
      }
    }
  }

  const churnPeople = people.filter((person) => churnIds.has(person.id));
  for (const person of churnPeople) {
    const branch = branchById[person.branchId];
    const product = productById[SHOP.regularProduct];
    let cursor = new Date(Date.UTC(2025, 10, 12));
    const stop = new Date(Date.UTC(2026, 7, 20));
    while (cursor <= stop) {
      const date = cursor.toISOString().slice(0, 10);
      const receipt = `R${receiptNo++}`;
      const cashier = cashiers.find((item) => item.branchId === branch.id);
      sales.push({
        Txn_Dt: date,
        Brnch: branch.name,
        Prod_Nm: product.name,
        Qty_Out: 1,
        Unit_Amt: product.price,
        Line_Total: product.price,
        Cust_Nm: `${person.first} ${person.last}`,
        Phone_No: person.phone,
        Cashier: cashier ? cashier.name : "Ngozi Eze",
        Pay_Mtd: "Cash",
        Rcpt: receipt,
      });
      const ref = `sales:${sales.length}`;
      remember("customer", person.id, ref);
      remember("product", product.id, ref);
      remember("branch", branch.id, ref);
      if (cashier) remember("staff", cashier.id, ref);
      const soldKey = `${branch.id}|${product.id}|${date.slice(0, 7)}`;
      soldByKey[soldKey] = (soldByKey[soldKey] || 0) + 1;
      const cashKey = `${branch.id}|${date.slice(0, 7)}`;
      cashByBranchMonth[cashKey] = (cashByBranchMonth[cashKey] || 0) + product.price;
      cursor.setUTCDate(cursor.getUTCDate() + 12);
    }
  }

  const onHand = {};
  for (const branch of BRANCHES) {
    for (const product of PRODUCTS) {
      onHand[`${branch.id}|${product.id}`] = int(40, 120);
    }
  }

  for (const month of MONTHS) {
    for (const branch of BRANCHES) {
      for (const product of PRODUCTS) {
        const key = `${branch.id}|${product.id}`;
        const sold = soldByKey[`${key}|${month.key}`] || 0;
        let received = Math.max(sold, Math.round(product.base * (0.8 + rand() * 0.4)));
        let sent = sold;
        if (branch.id === SHOP.dropBranch && product.id === SHOP.leakProduct && month.key >= "2026-07") {
          sent += 80;
        }
        const stockout = month.key === "2026-10" && SHOP.outs.some((item) => item.branch === branch.id && item.product === product.id);
        if (stockout) received = Math.round(sold * 0.15);
        const before = onHand[key];
        let after = Math.max(0, before + received - sent);
        if (branch.id === SHOP.dropBranch && product.id === SHOP.leakProduct) after = Math.max(after, 48);
        if (stockout) after = int(4, 8);
        onHand[key] = after;
        const day = int(1, 27);
        const blankDate = chance(0.04) && !stockout;
        stock.push({
          Move_Date: blankDate ? "" : iso(month.year, month.month, day),
          Branch_Name: pick(branch.variants),
          Item_Name: pick(product.variants),
          Qty_In: received,
          Qty_Out: sent,
          On_Hand: after,
          Note: "",
        });
        const ref = `stock:${stock.length}`;
        remember("product", product.id, ref);
        remember("branch", branch.id, ref);
      }
    }
  }

  for (const month of MONTHS) {
    for (const branch of BRANCHES) {
      const cash = cashByBranchMonth[`${branch.id}|${month.key}`] || 0;
      const ratio = branch.id === SHOP.cashBranch && month.key === "2026-09" ? 0.58 : 0.98;
      const deposit = Math.round(cash * ratio);
      const parts = 4;
      let left = deposit;
      for (let part = 0; part < parts; part++) {
        const amount = part === parts - 1 ? left : Math.round(deposit / parts);
        left -= amount;
        const day = 7 * part + int(1, 5);
        bank.push({
          Value_Date: iso(month.year, month.month, Math.min(day, 27)),
          Narration: `Cash deposit ${branch.name}`,
          Credit: amount,
          Debit: "",
          Branch_Tag: pick(branch.variants),
          Bank_Ref: `DEP-${branch.id.slice(0, 3).toUpperCase()}-${month.key}-${part + 1}`,
        });
        remember("branch", branch.id, `bank:${bank.length}`);
      }
    }
  }

  for (let n = 0; n < 14; n++) {
    bank.push({
      Value_Date: iso(2026, 5, int(1, 28)),
      Narration: "Counter deposit",
      Credit: int(4000, 12000),
      Debit: "",
      Branch_Tag: "Ikeja",
      Bank_Ref: `RCPT-${90000 + n}`,
    });
  }

  for (let n = 0; n < 28; n++) {
    const customer = refundCustomers[n % refundCustomers.length];
    const date = iso(2026, 8, 1 + (n % 27));
    pos.push({
      Sale_Date: date,
      Outlet: branchById[SHOP.refundBranch].name,
      Tender: "Cash",
      Amt: int(18000, 42000),
      Is_Refund: "Yes",
      Customer_Name: `${customer.first} ${customer.last}`,
      Cashier_Name: SHOP.refundCashier,
      Pos_Ref: `RF-ADA-${100 + n}`,
    });
    remember("customer", customer.id, `pos:${pos.length}`);
    remember("staff", "adaeze", `pos:${pos.length}`);
    remember("branch", SHOP.refundBranch, `pos:${pos.length}`);
  }

  for (let n = 0; n < 18; n++) {
    const cashier = cashiers.find((item) => item.id !== "adaeze");
    const chosen = cashiers[n % cashiers.length];
    if (chosen.id === "adaeze") continue;
    pos.push({
      Sale_Date: iso(2026, int(0, 9), int(1, 27)),
      Outlet: branchById[chosen.branchId].name,
      Tender: "Cash",
      Amt: int(1500, 6000),
      Is_Refund: "Yes",
      Customer_Name: `${pick(FIRST)} ${pick(LAST)}`,
      Cashier_Name: chosen.name,
      Pos_Ref: `RF-N-${200 + n}`,
    });
  }

  const staff = [];
  [...managers, ...cashiers].forEach((person) => {
    const branch = branchById[person.branchId];
    staff.push({
      Staff_Name: person.id === "tunde" ? "Mr Tunde Bakare" : person.name,
      Role: person.role,
      Branch: branch.name,
      Phone: `080${String(31000000 + staff.length).padStart(8, "0")}`,
      Start_Date: person.moved || "2024-03-01",
      Previous_Branch: person.previous || "",
    });
    remember("staff", person.id, `staff:${staff.length}`);
    remember("branch", person.branchId, `staff:${staff.length}`);
  });

  Object.values(groups).forEach((bucket) => {
    Object.keys(bucket).forEach((key) => {
      bucket[key] = bucket[key].filter(Boolean);
    });
  });

  return {
    files: { sales, stock, pos, bank, staff },
    truth: {
      pack: SHOP.pack,
      business: SHOP.business,
      asOf: "2026-11-01",
      groups,
      problems: {
        stock_gap: { branchId: SHOP.dropBranch, productId: SHOP.leakProduct, branch: branchById[SHOP.dropBranch].name, product: productById[SHOP.leakProduct].name },
        refund_ring: {
          cashier: SHOP.refundCashier,
          branch: branchById[SHOP.refundBranch].name,
          customers: refundCustomers.map((person) => `${person.first} ${person.last}`),
        },
        cash_gap: { branchId: SHOP.cashBranch, branch: branchById[SHOP.cashBranch].name, month: "2026-09" },
        stockouts: SHOP.outs.map((item) => ({
          branch: branchById[item.branch].name,
          product: productById[item.product].name,
        })),
        churn: people.filter((person) => churnIds.has(person.id)).map((person) => fullName(person)),
        movedStaff: { name: "Tunde Bakare", from: SHOP.moverFromName, to: branchById[SHOP.moverTo].name },
      },
    },
  };
}

function buildPayments() {
  const people = [];
  for (let i = 0; i < 220; i++) {
    people.push({
      id: `m${i + 1}`,
      first: FIRST[i % FIRST.length],
      last: LAST[(i * 5) % LAST.length],
      phone: `081${String(40000000 + i).padStart(8, "0")}`,
      account: `10${String(10000000 + i)}`,
      town: pick(["Lagos", "Abuja", "Kano", "Port Harcourt", "Ibadan"]),
    });
  }
  const ring = people.slice(0, 5);
  const mule = people[8];
  const senders = people.slice(20, 28);
  const outside = {
    id: "outside",
    first: "Quick",
    last: "Holdings",
    phone: "08190001111",
    account: "2099001100",
    town: "Lagos",
  };
  people.push(outside);

  const movements = [];
  const groups = { customer: {}, account: {} };
  const remember = (kind, key, ref) => {
    if (!groups[kind][key]) groups[kind][key] = [];
    groups[kind][key].push(ref);
  };

  for (let n = 0; n < 900; n++) {
    const from = pick(people.slice(30));
    const to = pick(people.slice(30));
    if (from.id === to.id) continue;
    movements.push({
      Txn_Date: iso(2026, 8 + (n % 2), int(1, 27)),
      From_Acct: from.account,
      To_Acct: to.account,
      Amt: int(2000, 45000),
      Channel: chance(0.55) ? "Mobile money" : "Bank transfer",
      Narration: "Everyday transfer",
    });
  }

  const ringAmounts = [510000, 495000, 520000, 505000, 498000];
  ring.forEach((person, index) => {
    const next = ring[(index + 1) % ring.length];
    movements.push({
      Txn_Date: iso(2026, 9, 4 + index * 2),
      From_Acct: person.account,
      To_Acct: next.account,
      Amt: ringAmounts[index],
      Channel: index % 2 ? "Mobile money" : "Bank transfer",
      Narration: "Account transfer",
    });
  });

  senders.forEach((sender, index) => {
    movements.push({
      Txn_Date: iso(2026, 9, 20 + (index % 2)),
      From_Acct: sender.account,
      To_Acct: mule.account,
      Amt: int(70000, 95000),
      Channel: "Mobile money",
      Narration: "Incoming",
    });
  });
  movements.push({
    Txn_Date: iso(2026, 9, 22),
    From_Acct: mule.account,
    To_Acct: outside.account,
    Amt: 620000,
    Channel: "Bank transfer",
    Narration: "Same day onward",
  });

  const peopleRows = people.map((person) => {
    const style = chance(0.15) ? "case" : "plain";
    return {
      Person_Name: personName(person, style),
      Mobile_No: chance(0.1) ? "" : person.phone,
      Account: person.account,
      Town: person.town,
    };
  });

  people.forEach((person, index) => {
    remember("customer", person.id, `people:${index + 1}`);
    remember("account", person.account, `people:${index + 1}`);
  });
  movements.forEach((row, index) => {
    remember("account", row.From_Acct, `movements:${index + 1}`);
    remember("account", row.To_Acct, `movements:${index + 1}`);
  });

  return {
    files: { people: peopleRows, movements },
    truth: {
      pack: "payments",
      business: "Citygate Transfers",
      asOf: "2026-11-01",
      groups,
      problems: {
        fraud_ring: ring.map((person) => ({ name: `${person.first} ${person.last}`, account: person.account })),
        mule: {
          name: `${mule.first} ${mule.last}`,
          account: mule.account,
          onward: outside.account,
        },
      },
    },
  };
}

function stripNulls(groups) {
  return groups;
}

function item(id, name, price, base) {
  return { id, name, price, base, variants: [name, `${name} packs`, name.replace(/(\d+)/, "$1 ")] };
}

function saveTrade(folder, built) {
  const dir = join(outDir, folder);
  mkdirSync(dir, { recursive: true });
  writeCsv(dir, "sales.csv", ["Txn_Dt", "Brnch", "Prod_Nm", "Qty_Out", "Unit_Amt", "Line_Total", "Cust_Nm", "Phone_No", "Cashier", "Pay_Mtd", "Rcpt"], built.files.sales);
  writeCsv(dir, "stock.csv", ["Move_Date", "Branch_Name", "Item_Name", "Qty_In", "Qty_Out", "On_Hand", "Note"], built.files.stock);
  writeCsv(dir, "pos.csv", ["Sale_Date", "Outlet", "Tender", "Amt", "Is_Refund", "Customer_Name", "Cashier_Name", "Pos_Ref"], built.files.pos);
  writeCsv(dir, "bank.csv", ["Value_Date", "Narration", "Credit", "Debit", "Branch_Tag", "Bank_Ref"], built.files.bank);
  writeCsv(dir, "staff.csv", ["Staff_Name", "Role", "Branch", "Phone", "Start_Date", "Previous_Branch"], built.files.staff);
  writeFileSync(join(dir, "truth.json"), JSON.stringify(built.truth));
}

const pharmacyBranches = BRANCHES.map((branch) => ({ ...branch, variants: [...branch.variants] }));
const pharmacyProducts = PRODUCTS.map((product) => ({ ...product, variants: [...product.variants] }));

function renamed(list, names) {
  return list.map((branch) => ({ ...branch, name: names[branch.id] || branch.name, city: names[branch.id] || branch.city, variants: [names[branch.id] || branch.name, `${names[branch.id] || branch.name} site`] }));
}

useSeed(20261114);
const pharmacy = buildPharmacy();
saveTrade("pharmacy", pharmacy);

useSeed(20261115);
BRANCHES = renamed(pharmacyBranches, {
  ikeja: "Apapa",
  surulere: "Onitsha",
  yaba: "Aba",
  lekki: "Trade Fair",
  bodija: "Ibadan Depot",
  gra: "Port Harcourt Depot",
  wuse: "Kano Depot",
  garki: "Kaduna Depot",
  kano: "Enugu Depot",
  enugu: "Jos Depot",
  benin: "Benin Depot",
  kaduna: "Maiduguri Depot",
});
PRODUCTS = [
  item("amox", "Cement 50kg", 9800, 46),
  item("para", "Binding wire", 4500, 90),
  item("ors", "Floor tiles", 6200, 70),
  item("vitc", "Emulsion paint 20L", 18500, 36),
  item("cough", "Roofing sheet", 7400, 22),
  item("anti", "PVC pipe", 3100, 28),
  item("bp", "Tile adhesive", 5600, 18),
  item("zinc", "Nails 2 inch", 1800, 30),
  item("bandage", "Sand 20 tonne", 42000, 24),
  item("soap", "Granite", 38000, 40),
  item("dettol", "Iron rod 12mm", 8900, 16),
  item("milk", "Marine board", 14500, 20),
  item("rice", "Door frame", 22000, 14),
  item("oil", "Primer 4L", 6500, 26),
  item("detergent", "Padlock", 900, 32),
  item("water", "Wheelbarrow", 15000, 48),
];
SHOP = { ...SHOP, pack: "distributor", business: "Okoro Wholesale", refundCashier: "Chinedu Okafor", moverFromName: "Aba" };
const distributor = buildPharmacy();
saveTrade("distributor", distributor);

useSeed(20261116);
BRANCHES = renamed(pharmacyBranches, {
  ikeja: "Ikeja Clinic",
  surulere: "Yaba Clinic",
  yaba: "Surulere Clinic",
  lekki: "Lekki Clinic",
  bodija: "Ibadan Clinic",
  gra: "Port Harcourt Clinic",
  wuse: "Wuse Clinic",
  garki: "Garki Clinic",
  kano: "Kano Clinic",
  enugu: "Enugu Clinic",
  benin: "Benin Clinic",
  kaduna: "Kaduna Clinic",
});
PRODUCTS = [
  item("amox", "Examination gloves", 2500, 46),
  item("para", "Gauze roll", 800, 90),
  item("ors", "Syringes", 1200, 70),
  item("vitc", "Saline bags", 1800, 36),
  item("cough", "Cannula", 600, 22),
  item("anti", "Face masks", 1500, 28),
  item("bp", "Cotton wool", 700, 18),
  item("zinc", "Plaster roll", 900, 30),
  item("bandage", "Antiseptic", 2100, 24),
  item("soap", "Thermometer", 3500, 40),
  item("dettol", "Drip set", 1100, 16),
  item("milk", "Lab coat", 8000, 20),
  item("rice", "Wheelchair", 45000, 14),
  item("oil", "Blood pressure cuff", 12000, 26),
  item("detergent", "Hand wash", 1600, 32),
  item("water", "Bed sheet", 4000, 48),
];
SHOP = { ...SHOP, pack: "clinics", business: "Haven Clinics", refundCashier: "Amaka Obi", moverFromName: "Surulere Clinic" };
const clinics = buildPharmacy();
saveTrade("clinics", clinics);

useSeed(20261117);
const payments = buildPayments();
const payDir = join(outDir, "payments");
mkdirSync(payDir, { recursive: true });
writeCsv(payDir, "people.csv", ["Person_Name", "Mobile_No", "Account", "Town"], payments.files.people);
writeCsv(payDir, "movements.csv", ["Txn_Date", "From_Acct", "To_Acct", "Amt", "Channel", "Narration"], payments.files.movements);
writeFileSync(join(payDir, "truth.json"), JSON.stringify(payments.truth));

console.log(
  JSON.stringify({
    pharmacy: pharmacy.files.sales.length,
    distributor: distributor.files.sales.length,
    clinics: clinics.files.sales.length,
    payments: payments.files.movements.length,
  }),
);
