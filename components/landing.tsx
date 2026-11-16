"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bank,
  ChartLineUp,
  CheckCircle,
  ShieldCheck,
  Storefront,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { startPack } from "@/app/actions";

const SAMPLES = [
  { id: "pharmacy" as const, title: "A pharmacy and shop", text: "12 branches. Sales, stock, the bank, and the staff list.", },
  { id: "distributor" as const, title: "A building-materials distributor", text: "12 depots. Invoices, warehouse stock, and collections.", },
  { id: "clinics" as const, title: "A private clinic group", text: "12 sites. Bills, supplies, and the front desk.", },
  { id: "payments" as const, title: "A payments business", text: "Bank transfers and mobile money, on the same steps.", },
];

const FOUND = [
  { icon: WarningCircle, title: "Stock that left without a sale", text: "A shelf count and the sales book should agree. When they do not, Cognosco shows the packs and the branch." },
  { icon: Bank, title: "Cash that did not reach the bank", text: "Cash taken in the shop is compared with what the bank received for that branch." },
  { icon: UsersThree, title: "Refunds that keep going to one small group", text: "A cashier, a handful of customers, and the same family name, shown together." },
  { icon: ChartLineUp, title: "Items about to run out", text: "Recent sales against what is still on the shelf, so a manager can reorder this week." },
  { icon: Storefront, title: "Regular customers who have gone quiet", text: "People who used to buy often, and then stopped. Easier to win back now than next month." },
  { icon: CheckCircle, title: "A next step you approve", text: "Cognosco does not change the till. A person approves, and the decision is kept in order." },
];

export function Landing() {
  const router = useRouter();
  const [busy, setBusy] = useState<"pharmacy" | "distributor" | "clinics" | "payments" | null>(null);

  async function open(pack: "pharmacy" | "distributor" | "clinics" | "payments") {
    setBusy(pack);
    await startPack(pack);
    router.push("/app");
  }

  return (
    <div className="land">
      <header className="land-nav">
        <a className="land-logo" href="#top">
          <span className="mark">C</span>
          Cognosco
        </a>
        <nav>
          <a href="#how">How it works</a>
          <a href="#finds">What it shows</a>
          <a href="#who">Who it is for</a>
        </nav>
        <a className="btn small" href="#samples">See a sample <ArrowRight weight="bold" /></a>
      </header>

      <section className="land-hero" id="top">
        <div className="land-hero-copy">
          <p className="eyebrow">For organisations with many sites</p>
          <h1>See the whole business. From the files you already keep.</h1>
          <p className="lede">
            Sales live in one file. Stock lives in another. The bank is somewhere else. Cognosco reads them, joins the same people and the same items, and shows where money is going. You confirm. You approve. Nothing is replaced.
          </p>
          <div className="land-cta">
            <a className="btn" href="#samples">Open a sample <ArrowRight weight="bold" /></a>
          </div>
          <p className="hint">Four fictional businesses. The same steps in each. Safe to show anywhere.</p>
        </div>
        <aside className="land-stage" aria-hidden="true">
          <div className="land-window">
            <div className="land-window-bar"><span /><span /><span /></div>
            <div className="land-window-body">
              <div className="land-kpis">
                <div><span>Sales</span><strong>₦18.4m</strong></div>
                <div><span>Customers</span><strong>1,684</strong></div>
                <div><span>Needs a look</span><strong>5</strong></div>
              </div>
              <svg className="chart" viewBox="0 0 320 90">
                <path className="chart-area" d="M10,70 L50,62 L90,64 L130,48 L170,52 L210,30 L250,38 L310,22 L310,84 L10,84 Z" />
                <path className="chart-line" d="M10,70 L50,62 L90,64 L130,48 L170,52 L210,30 L250,38 L310,22" />
              </svg>
              <div className="land-alert">
                <WarningCircle size={18} weight="fill" color="#b42318" />
                <div>
                  <strong>One site is short</strong>
                  <p>An item left faster than it was sold.</p>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="land-block" id="how">
        <p className="eyebrow">How it works</p>
        <h2>Three steps. Then the picture.</h2>
        <div className="path">
          <article>
            <span className="n">1</span>
            <strong>Bring in the files</strong>
            <p>The sales book, the stock sheets, card payments, the bank, and the staff list. Cognosco does not replace them.</p>
          </article>
          <article>
            <span className="n">2</span>
            <strong>You confirm</strong>
            <p>It suggests what each column means, and which rows are the same person. You say yes, or you keep them apart.</p>
          </article>
          <article>
            <span className="n">3</span>
            <strong>See what to do</strong>
            <p>A picture of every branch, what needs a look, and a next step that waits for a manager.</p>
          </article>
        </div>
      </section>

      <section className="land-block land-finds" id="finds">
        <p className="eyebrow">What you see</p>
        <h2>The questions an owner already asks.</h2>
        <div className="land-grid">
          {FOUND.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} style={{ animationDelay: `${index * 70}ms` }}>
                <span className="ico"><Icon size={22} weight="duotone" /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="land-split" id="who">
        <div>
          <p className="eyebrow">Who it is for</p>
          <h2>Many branches. One owner. Scattered files.</h2>
          <p>Any organisation with many sites and scattered records. A shop, a warehouse, a clinic, or a payments desk. The trade changes. The steps do not.</p>
          <ul>
            <li><ShieldCheck weight="bold" /> The records stay on your machine.</li>
            <li><CheckCircle weight="bold" /> You confirm a join before it is used.</li>
            <li><CheckCircle weight="bold" /> You approve a step before it is kept.</li>
          </ul>
        </div>
        <div className="land-quote">
          <p>The same reading joins messy rows into real people, then points at what does not add up. A shop, a depot, a clinic, and a payments book can each be opened as a sample.</p>
          <span>One way of working. Four trades.</span>
        </div>
      </section>

      <section className="land-block" id="samples">
        <p className="eyebrow">Samples</p>
        <h2>Open one and walk through it.</h2>
        <p>Each sample is fictional. Each one uses the same steps. About seven minutes.</p>
        <div className="land-grid">
          {SAMPLES.map((sample) => (
            <article key={sample.id}>
              <h3>{sample.title}</h3>
              <p>{sample.text}</p>
              <button className="btn small" style={{ marginTop: 14 }} disabled={busy !== null} onClick={() => open(sample.id)}>
                {busy === sample.id ? "Opening..." : "Open this sample"} <ArrowRight weight="bold" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="land-close">
        <h2>The records stay where they are.</h2>
        <p>Cognosco reads them, you confirm the joins, and a person approves the next step.</p>
        <div className="land-cta">
          <a className="btn" href="#samples">Choose a sample <ArrowRight weight="bold" /></a>
        </div>
      </section>

      <footer className="land-foot">
        <span>Cognosco</span>
        <span>See the whole business.</span>
      </footer>
    </div>
  );
}
