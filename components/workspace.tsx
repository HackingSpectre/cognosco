"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bank,
  ChartBar,
  ChatCircle,
  Check,
  EnvelopeSimple,
  FolderOpen,
  IdentificationCard,
  Package,
  Receipt,
  Table,
  Target,
  UsersThree,
  Warning,
  X,
} from "@phosphor-icons/react";
import {
  changeFigure,
  loadAnswer,
  loadBranch,
  markRecordChanged,
  repairRecord,
  saveColumns,
  saveDecision,
  saveJoins,
  saveSplit,
  startPack,
  undoFigure,
} from "@/app/actions";
import { MEANING_LABELS, type Meaning } from "@/lib/types";
import type { AppView } from "@/lib/workspace";

const STEPS = [
  { id: "files", label: "The files", group: "First, the files", icon: FolderOpen },
  { id: "columns", label: "The columns", group: "First, the files", icon: Table },
  { id: "joins", label: "Same people", group: "First, the files", icon: UsersThree },
  { id: "business", label: "The business", group: "Then the picture", icon: ChartBar },
  { id: "attention", label: "What needs a look", group: "Then the picture", icon: Warning },
  { id: "ask", label: "Ask", group: "Then the picture", icon: ChatCircle },
  { id: "decisions", label: "Decisions", group: "Then the picture", icon: Check },
  { id: "monday", label: "Monday note", group: "Then the picture", icon: EnvelopeSimple },
  { id: "results", label: "What we caught", group: "Then the picture", icon: Target },
] as const;

type Step = (typeof STEPS)[number]["id"];

export function Workspace({ initial }: { initial: AppView }) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [step, setStep] = useState<Step>("files");
  const [busy, setBusy] = useState(false);
  const [meanings, setMeanings] = useState<Record<string, Meaning>>(() => initialMeanings(initial));
  const [question, setQuestion] = useState(initial.questions[0] || "");
  const locked = !data.columnsConfirmed || !data.joinsConfirmed;

  async function run(task: () => Promise<AppView>, next?: Step) {
    setBusy(true);
    const view = await task();
    setData(view);
    setMeanings(initialMeanings(view));
    if (next) setStep(next);
    setBusy(false);
  }

  const openSteps = useMemo(() => new Set<string>(locked ? ["files", "columns", "joins"] : STEPS.map((item) => item.id)), [locked]);
  let lastGroup = "";

  return (
    <div className="shell">
      <aside className="nav">
        <Link className="brand-row" href="/" style={{ textDecoration: "none" }}>
          <div className="mark">C</div>
          <div>
            <p className="brand">Cognosco</p>
            <p className="brand-sub">{data.business}</p>
          </div>
        </Link>
        {STEPS.map((item) => {
          const showGroup = item.group !== lastGroup;
          lastGroup = item.group;
          const Icon = item.icon;
          return (
            <div key={item.id}>
              {showGroup && <p className="nav-label">{item.group}</p>}
              <button className={`step ${step === item.id ? "on" : ""}`} disabled={!openSteps.has(item.id) || busy} onClick={() => setStep(item.id)} title={locked && !openSteps.has(item.id) ? "Confirm the columns and the people first" : item.label}>
                <span className="step-ico"><Icon size={16} weight="bold" /></span>
                <span>{item.label}</span>
              </button>
            </div>
          );
        })}
        <p className="nav-label">Other samples</p>
        {(
          [
            ["pharmacy", "Pharmacy and shop"],
            ["distributor", "Wholesale depots"],
            ["clinics", "Clinic group"],
            ["payments", "Payments"],
          ] as const
        )
          .filter(([id]) => id !== data.pack)
          .map(([id, label]) => (
            <button key={id} className="step" disabled={busy} onClick={() => run(() => startPack(id), "files").then(() => router.refresh())}>
              <span>{label}</span>
            </button>
          ))}
      </aside>
      <main className="main">
        {busy && <p className="busy-line">Working through the files.</p>}
        <div className="stage-body" key={step}>
        {step === "files" && <Files data={data} busy={busy} onNext={() => setStep("columns")} />}
        {step === "columns" && (
          <Columns
            data={data}
            meanings={meanings}
            busy={busy}
            onChange={(key, meaning) => setMeanings((current) => ({ ...current, [key]: meaning }))}
            onSave={() => run(() => saveColumns(meanings), "joins")}
          />
        )}
        {step === "joins" && <Joins data={data} busy={busy} onSplit={(id, separate) => run(() => saveSplit(id, separate))} onSave={() => run(() => saveJoins(), "business")} />}
        {step === "business" && <Business data={data} busy={busy} onOpen={(name) => run(() => loadBranch(name))} />}
        {step === "attention" && <Attention data={data} />}
        {step === "ask" && (
          <Ask
            data={data}
            question={question}
            busy={busy}
            onQuestion={setQuestion}
            onAsk={(value) => run(() => loadAnswer(value))}
          />
        )}
        {step === "decisions" && (
          <Decisions
            data={data}
            busy={busy}
            onDecide={(id, status) => run(() => saveDecision(id, status))}
            onChange={() => run(changeFigure)}
            onUndo={() => run(undoFigure)}
            onBreak={() => run(markRecordChanged)}
            onRepair={() => run(repairRecord)}
          />
        )}
        {step === "monday" && <Monday data={data} />}
        {step === "results" && <Results data={data} />}
        </div>
      </main>
    </div>
  );
}

function initialMeanings(data: AppView): Record<string, Meaning> {
  const meanings: Record<string, Meaning> = {};
  data.columns.forEach((file) => {
    file.columns.forEach((column) => {
      meanings[`${file.file}::${column.column}`] = column.meaning;
    });
  });
  return meanings;
}

function fileIcon(title: string) {
  if (/bank/i.test(title)) return Bank;
  if (/staff|holder|people/i.test(title)) return IdentificationCard;
  if (/stock/i.test(title)) return Package;
  if (/transfer|payment|card/i.test(title)) return Receipt;
  return FolderOpen;
}

function Files({ data, busy, onNext }: { data: AppView; busy: boolean; onNext: () => void }) {
  const total = data.sources.reduce((sum, file) => sum + file.rows, 0);
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Step 1. Bring in the files</p>
        <h2>The records you already keep.</h2>
        <p>{data.about} Cognosco has read {total.toLocaleString("en-GB")} rows. Each row still sits in the file it came from. Nothing is replaced.</p>
      </header>
      <div className="path">
        <article>
          <span className="n">1</span>
          <strong>Read the files</strong>
          <p>Sales, stock, payments, the bank, the staff list.</p>
        </article>
        <article>
          <span className="n">2</span>
          <strong>You confirm</strong>
          <p>What each column means, and which rows are the same person.</p>
        </article>
        <article>
          <span className="n">3</span>
          <strong>See the picture</strong>
          <p>The business, what needs a look, and the next step for you to approve.</p>
        </article>
      </div>
      <div className="cards">
        {data.sources.map((file, index) => {
          const Icon = fileIcon(file.title);
          return (
            <article className="file-card" key={file.file} style={{ animationDelay: `${index * 70}ms` }}>
              <div className="top"><span className="ico"><Icon size={22} weight="duotone" /></span></div>
              <h3>{file.title}</h3>
              <div className="metric">{file.rows.toLocaleString("en-GB")}</div>
              <div className="hint">{file.columns} columns</div>
            </article>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn" disabled={busy} onClick={onNext}>
          Name the columns <ArrowRight weight="bold" />
        </button>
      </div>
    </>
  );
}

function Columns({
  data,
  meanings,
  busy,
  onChange,
  onSave,
}: {
  data: AppView;
  meanings: Record<string, Meaning>;
  busy: boolean;
  onChange: (key: string, meaning: Meaning) => void;
  onSave: () => void;
}) {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Step 2. Name the columns</p>
        <h2>Cognosco suggests. You confirm.</h2>
        <p>Column titles in these files are short and uneven. Check the suggestion. Change any that are wrong. Nothing is joined until you say so.</p>
      </header>
      {data.columns.map((file) => (
        <section className="panel" key={file.file}>
          <h3>{file.title}</h3>
          <p className="hint">{file.rows.toLocaleString("en-GB")} rows</p>
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>This means</th>
                <th>Examples</th>
              </tr>
            </thead>
            <tbody>
              {file.columns.map((column) => {
                const key = `${file.file}::${column.column}`;
                return (
                  <tr key={key}>
                    <td>{column.column}</td>
                    <td>
                      <select value={meanings[key] || column.meaning} onChange={(event) => onChange(key, event.target.value as Meaning)}>
                        {Object.entries(MEANING_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="samples">{column.samples.join("  ·  ")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      <div className="actions">
        <button className="btn" disabled={busy} onClick={onSave}>
          {data.columnsConfirmed ? "Save these names" : "Confirm the columns"}
        </button>
      </div>
    </>
  );
}

function Joins({
  data,
  busy,
  onSplit,
  onSave,
}: {
  data: AppView;
  busy: boolean;
  onSplit: (id: string, separate: boolean) => void;
  onSave: () => void;
}) {
  const joins = data.joins;
  if (!joins) return <p>Confirm the columns first.</p>;
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Step 3. Join the same people</p>
        <h2>{joins.headline}</h2>
        <p>{joins.detail} A phone number is the strongest clue. The same name, spelled a little differently, is the next. You can still keep two rows apart.</p>
      </header>
      <div className="cards">
        {joins.examples.map((example) => (
          <article className="file-card" key={example.title}>
            <span className="pill good">Joined</span>
            <h3 style={{ fontFamily: "var(--serif)", fontSize: 28, marginTop: 12 }}>{example.title}</h3>
            <p>{example.because}</p>
            {example.rows.map((row) => (
              <div className="source" key={row}>{row}</div>
            ))}
          </article>
        ))}
      </div>
      {joins.uncertain.length > 0 && (
        <section style={{ marginTop: 36 }}>
          <h3 style={{ fontSize: 32, marginBottom: 8 }}>Close, but worth a look</h3>
          <div className="list">
            {joins.uncertain.map((item) => (
              <div className="rowline" key={item.id}>
                <div>
                  <strong>{item.left}</strong> and <strong>{item.right}</strong>
                  <div className="muted">{item.because}</div>
                </div>
                <button className="btn ghost small" disabled={busy} onClick={() => onSplit(item.id, !item.keptSeparate)}>
                  {item.keptSeparate ? "Join them" : "Keep apart"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="actions">
        <button className="btn" disabled={busy} onClick={onSave}>
          {data.joinsConfirmed ? "The picture is ready" : "Build the picture"}
        </button>
      </div>
    </>
  );
}

function money(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function MonthChart({ months }: { months: { label: string; share: number; amount: string }[] }) {
  const width = 720;
  const height = 200;
  const pad = 16;
  const points = months.map((month, index) => {
    const x = pad + (index * (width - pad * 2)) / Math.max(months.length - 1, 1);
    const y = height - 28 - month.share * (height - 56);
    return { ...month, x, y };
  });
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points[points.length - 1].x},${height - 24} L${points[0].x},${height - 24} Z`;
  return (
    <>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sales by month">
        <path className="chart-area" d={area} />
        <path className="chart-line" d={line} />
        {points.map((point) => (
          <circle className="chart-dot" key={point.label} cx={point.x} cy={point.y} r="5">
            <title>{point.label}: {point.amount}</title>
          </circle>
        ))}
      </svg>
      <div className="month-labels">
        {months.map((month) => <span key={month.label}>{month.label.slice(0, 3)}</span>)}
      </div>
    </>
  );
}

function Business({ data, busy, onOpen }: { data: AppView; busy: boolean; onOpen: (name: string) => void }) {
  const business = data.businessView;
  if (!business) return <p>Build the picture first.</p>;
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">The picture</p>
        <h2>{data.business}</h2>
        <p>{business.branchList.length ? "Every total below can be opened back to the rows it came from. Click a branch." : "Every total below comes from the rows in the files."}</p>
      </header>
      <div className="stats">
        <article className="stat">
          <div className="hint">{data.pack === "pharmacy" ? "Sales in the files" : "Money moved"}</div>
          <div className="metric">{data.pack === "pharmacy" ? business.sales : business.moved}</div>
        </article>
        <article className="stat">
          <div className="hint">Real customers</div>
          <div className="metric">{business.customers}</div>
          <div className="hint">from {business.rawCustomers} rows that named a person</div>
        </article>
        <article className="stat">
          <div className="hint">{data.pack === "pharmacy" ? "Branches" : "Accounts"}</div>
          <div className="metric">{data.pack === "pharmacy" ? business.branchCount : business.accounts}</div>
          <div className="hint">{data.pack === "pharmacy" ? `${business.products} items` : "People and accounts in one picture"}</div>
        </article>
      </div>
      {business.months.length > 1 && (
        <section className="panel">
          <h3>Sales by month</h3>
          <MonthChart months={business.months} />
        </section>
      )}
      {business.branchList.length > 0 && <section className="panel">
        <h3>Branches</h3>
        {business.branchList.map((branch) => {
          const max = Math.max(...business.branchList.map((item) => money(item.sales)), 1);
          return (
            <button className="branch" key={branch.name} disabled={busy} onClick={() => onOpen(branch.name)}>
              <strong>{branch.name}</strong>
              <span className="track"><span style={{ width: `${Math.max(8, (money(branch.sales) / max) * 100)}%` }} /></span>
              <span>
                {branch.sales} <span className={branch.note === "Quiet" ? "pill good" : "pill warn"}>{branch.note}</span>
              </span>
            </button>
          );
        })}
      </section>}
      {data.branch && (
        <section className="panel">
          <p className="kicker">Opened</p>
          <h3>{data.branch.name}</h3>
          <p>{data.branch.sales} in sales across these files.</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.branch.items.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.qty}</td>
                  <td>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="stack" style={{ marginTop: 16 }}>
            {data.branch.rows.map((row) => (
              <div key={`${row.file}-${row.line}`}>
                <div>{row.summary}</div>
                <div className="source">{row.file}, line {row.line}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      {business.notices.length > 0 && (
        <section style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 28 }}>Also noticed</h3>
          {business.notices.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </section>
      )}
    </>
  );
}

function Attention({ data }: { data: AppView }) {
  if (!data.findings.length) return <p>Build the picture first. If it is already built, nothing in these files needs a look.</p>;
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">What needs a look</p>
        <h2>Plain findings, each with the rows behind it.</h2>
      </header>
      <div>
        {data.findings.map((finding, index) => (
          <article className="finding" key={finding.id} style={{ animationDelay: `${index * 60}ms` }}>
            <span className="pill bad">Needs a look</span>
            <h3>{finding.title}</h3>
            <p>{finding.detail}</p>
            <p className="muted">{finding.reason}</p>
            {finding.nodes.length > 0 && <Network nodes={finding.nodes} links={finding.links} />}
            <div className="stack">
              {finding.rows.map((row) => (
                <div key={`${row.file}-${row.line}`}>
                  <div>{row.summary}</div>
                  <div className="source">{row.title}, line {row.line}</div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Network({ nodes, links }: { nodes: AppView["findings"][number]["nodes"]; links: AppView["findings"][number]["links"] }) {
  const center = nodes.find((node) => node.place === "center") || nodes[0];
  const around = nodes.filter((node) => node.id !== center?.id);
  const width = 640;
  const height = 320;
  const cx = width / 2;
  const cy = height / 2;
  const placed = around.map((node, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(around.length, 1) - Math.PI / 2;
    return { ...node, x: cx + Math.cos(angle) * 210, y: cy + Math.sin(angle) * 110 };
  });
  const point = (id: string) => (id === center?.id ? { x: cx, y: cy } : placed.find((node) => node.id === id));
  return (
    <svg className="network" viewBox={`0 0 ${width} ${height}`} role="img">
      {links.map((link, index) => {
        const from = point(link.from);
        const to = point(link.to);
        if (!from || !to) return null;
        return <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#eaeaea" strokeWidth="1.5" />;
      })}
      {center && (
        <g>
          <rect x={cx - 70} y={cy - 18} width="140" height="36" rx="8" fill="#111" />
          <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize="12">{short(center.label)}</text>
        </g>
      )}
      {placed.map((node) => (
        <g key={node.id}>
          <rect x={node.x - 64} y={node.y - 16} width="128" height="32" rx="8" fill="#fff" stroke="#eaeaea" />
          <text x={node.x} y={node.y + 4} textAnchor="middle" fill="#2f3437" fontSize="11">{short(node.label)}</text>
        </g>
      ))}
    </svg>
  );
}

function short(value: string): string {
  return value.length > 18 ? `${value.slice(0, 16)}...` : value;
}

function Ask({
  data,
  question,
  busy,
  onQuestion,
  onAsk,
}: {
  data: AppView;
  question: string;
  busy: boolean;
  onQuestion: (value: string) => void;
  onAsk: (value: string) => void;
}) {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Ask</p>
        <h2>Ask in ordinary words.</h2>
        <p>The answer points at the rows it used. If Cognosco cannot see it in the files, it says so.</p>
      </header>
      <form
        className="ask"
        onSubmit={(event) => {
          event.preventDefault();
          onAsk(question);
        }}
      >
        <input value={question} onChange={(event) => onQuestion(event.target.value)} aria-label="Your question" />
        <button className="btn" disabled={busy || !question.trim()}>Ask</button>
      </form>
      <div className="questions">
        {data.questions.map((item) => (
          <button key={item} disabled={busy} onClick={() => { onQuestion(item); onAsk(item); }}>{item}</button>
        ))}
      </div>
      {data.answer && (
        <article className="panel">
          <p>{data.answer.text}</p>
          <div className="stack">
            {data.answer.rows.map((row) => (
              <div key={`${row.file}-${row.line}`}>
                <div>{row.summary}</div>
                <div className="source">{row.title}, line {row.line}</div>
              </div>
            ))}
          </div>
        </article>
      )}
    </>
  );
}

function Decisions({
  data,
  busy,
  onDecide,
  onChange,
  onUndo,
  onBreak,
  onRepair,
}: {
  data: AppView;
  busy: boolean;
  onDecide: (id: string, status: "approved" | "rejected") => void;
  onChange: () => void;
  onUndo: () => void;
  onBreak: () => void;
  onRepair: () => void;
}) {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Decisions</p>
        <h2>A next step counts only when a person approves it.</h2>
        <p>Cognosco does not post anything to the till. It keeps the decision, in order, and it can tell if an earlier line is altered.</p>
      </header>
      <div>
        {data.waiting.map((item) => (
          <article className="finding" key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
            {item.done ? (
              <span className="pill good">Already decided</span>
            ) : (
              <div className="actions">
                <button className="btn small" disabled={busy} onClick={() => onDecide(item.id, "approved")}>
                  <Check weight="bold" /> Approve
                </button>
                <button className="btn ghost small" disabled={busy} onClick={() => onDecide(item.id, "rejected")}>
                  <X weight="bold" /> Set aside
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <section className="panel">
        <h3>Decision record</h3>
        <p>{data.recordNote}</p>
        {data.record.length === 0 && <p className="muted">Approve or set aside a step and it will be kept here.</p>}
        <div className="list">
          {data.record.map((item, index) => (
            <div className="rowline" key={`${item.title}-${index}`}>
              <div>
                <strong>{item.title}</strong>
                <div className="muted">{item.detail}</div>
              </div>
              <span className={item.status === "Approved" ? "pill good" : "pill"}>{item.status}</span>
            </div>
          ))}
        </div>
        <div className="actions">
          <button className="btn ghost small" disabled={busy || data.record.length === 0} onClick={onBreak}>Show a changed line</button>
          <button className="btn ghost small" disabled={busy} onClick={onRepair}>Restore the record</button>
        </div>
      </section>
      {data.pack === "pharmacy" && (
        <section className="panel">
          <h3>A changed figure</h3>
          <p>Bring the files in, then change one shelf count. Cognosco keeps the original and shows the difference.</p>
          {data.changeNote && <p>{data.changeNote}</p>}
          <div className="actions">
            <button className="btn small" disabled={busy} onClick={onChange}>Change a shelf count</button>
            <button className="btn ghost small" disabled={busy || !data.changeNote} onClick={onUndo}>Put the original back</button>
          </div>
        </section>
      )}
    </>
  );
}

function Monday({ data }: { data: AppView }) {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Monday note</p>
        <h2>What the owner would read on Monday.</h2>
      </header>
      <article className="panel">
        {data.monday.length === 0 && <p>Build the picture first.</p>}
        {data.monday.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </article>
    </>
  );
}

function Results({ data }: { data: AppView }) {
  return (
    <>
      <header className="page-head">
        <p className="eyebrow">What we caught</p>
        <h2>The problems were placed in the files beforehand.</h2>
        <p>{data.resultsSummary || "Build the picture to see how many of them Cognosco found."}</p>
      </header>
      <div>
        {data.results.map((line) => (
          <article className="finding" key={line.label}>
            <span className={line.ok ? "pill good" : "pill warn"}>{line.ok ? "Found" : "Short"}</span>
            <h3 style={{ marginTop: 12 }}>{line.label}</h3>
            <p>{line.detail}</p>
          </article>
        ))}
      </div>
    </>
  );
}
