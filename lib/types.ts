export const PACKS = ["pharmacy", "distributor", "clinics", "payments"] as const;
export type PackId = (typeof PACKS)[number];

export const MEANING_LABELS = {
  date: "A date",
  branch: "A branch",
  product: "An item",
  qty: "Quantity sold",
  qty_in: "Quantity received",
  qty_out: "Quantity sent out",
  on_hand: "Quantity on the shelf",
  amount: "An amount",
  unit_price: "A price",
  customer: "A customer name",
  phone: "A phone number",
  staff: "A staff name",
  pay_type: "How they paid",
  receipt: "A receipt number",
  refund: "Whether it is a refund",
  credit: "Money in",
  debit: "Money out",
  narration: "A description",
  reference: "A reference",
  from_account: "The account money left",
  to_account: "The account money reached",
  channel: "How the money moved",
  account: "An account number",
  town: "A town",
  note: "A note",
  role: "A role",
  started: "When they started",
  previous_branch: "Their earlier branch",
  skip: "Skip this column",
} as const;

export type Meaning = keyof typeof MEANING_LABELS;

export type SourceRow = {
  file: string;
  line: number;
  cells: Record<string, string>;
};

export type SourceFile = {
  id: string;
  file: string;
  title: string;
  rows: SourceRow[];
};

export type ColumnChoice = {
  file: string;
  column: string;
  meaning: Meaning;
  samples: string[];
};

export type Ref = { file: string; line: number };

export type Entity = {
  id: string;
  kind: "customer" | "product" | "branch" | "staff" | "account";
  name: string;
  extra: string[];
};

export type Sale = {
  ref: Ref;
  date: string;
  branchId: string;
  productId: string;
  customerId: string;
  staffId: string;
  qty: number;
  amount: number;
  pay: string;
  receipt: string;
};

export type StockMove = {
  ref: Ref;
  date: string;
  branchId: string;
  productId: string;
  received: number;
  sent: number;
  onHand: number;
};

export type Refund = {
  ref: Ref;
  date: string;
  branchId: string;
  customerId: string;
  staffId: string;
  amount: number;
};

export type Deposit = {
  ref: Ref;
  date: string;
  branchId: string;
  amount: number;
  reference: string;
  narration: string;
};

export type Transfer = {
  ref: Ref;
  date: string;
  fromId: string;
  toId: string;
  amount: number;
  channel: string;
  narration: string;
};

export type Picture = {
  pack: PackId;
  business: string;
  asOf: string;
  files: { file: string; title: string; rows: number }[];
  customers: Entity[];
  products: Entity[];
  branches: Entity[];
  staff: Entity[];
  accounts: Entity[];
  sales: Sale[];
  stock: StockMove[];
  refunds: Refund[];
  deposits: Deposit[];
  transfers: Transfer[];
  duplicateSales: number;
  unmatchedRefs: number;
  rawCustomerRows: number;
  uncertain: { id: string; left: string; right: string; because: string }[];
};

export type RowPreview = {
  file: string;
  title: string;
  line: number;
  summary: string;
};

export type LinkView = { from: string; to: string; label: string };
export type NodeView = { id: string; label: string; place: "center" | "around" };

export type Finding = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  reason: string;
  rows: RowPreview[];
  nodes: NodeView[];
  links: LinkView[];
};

export type Decision = {
  id: string;
  at: string;
  title: string;
  detail: string;
  status: "approved" | "rejected";
  previous: string;
};

export type SavedWork = {
  pack: PackId;
  started: boolean;
  columnsConfirmed: boolean;
  overrides: Record<string, Meaning>;
  joinsConfirmed: boolean;
  splits: string[];
  decisions: Decision[];
  tamper: { file: string; line: number; column: string; from: string; to: string } | null;
  decisionBroken: boolean;
};
