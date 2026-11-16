"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Bank, Storefront } from "@phosphor-icons/react";
import { startPack } from "@/app/actions";

export function Welcome() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open(pack: "pharmacy" | "payments") {
    setBusy(true);
    await startPack(pack);
    router.refresh();
  }

  return (
    <main className="welcome">
      <section className="welcome-copy">
        <div className="mark" style={{ marginBottom: 28 }}>C</div>
        <p className="eyebrow" style={{ color: "#e2a53a" }}>Cognosco</p>
        <h1>See the whole business.</h1>
        <p className="lede">
          A shop keeps sales in one file, stock in another, and the bank somewhere else. Cognosco reads those files, joins the same people and the same items, and shows where the money is going. You approve the next step. Nothing is replaced.
        </p>
      </section>
      <section className="welcome-side">
        <button className="welcome-card" disabled={busy} onClick={() => open("pharmacy")}>
          <Storefront size={28} weight="duotone" color="#1d4f91" />
          <h3>Balogun Pharmacy and Stores</h3>
          <p>12 branches. Sales, stock, card payments, the bank, and the staff list.</p>
          <span className="btn" style={{ marginTop: 16 }}>Open the shop <ArrowRight weight="bold" /></span>
        </button>
        <button className="welcome-card" disabled={busy} onClick={() => open("payments")}>
          <Bank size={28} weight="duotone" color="#1d4f91" />
          <h3>Citygate Transfers</h3>
          <p>The same steps, with bank and mobile money records.</p>
          <span className="btn ghost" style={{ marginTop: 16 }}>Open the payments business</span>
        </button>
        <p className="hint">The records are fictional.</p>
      </section>
    </main>
  );
}
