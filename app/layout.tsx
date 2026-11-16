import type { Metadata } from "next";
import { JetBrains_Mono, Newsreader, Outfit } from "next/font/google";
import "./globals.css";

const sans = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Cognosco",
  description: "See the whole business, from the files you already keep.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable}`} style={{ fontFamily: "var(--font-sans), Outfit, sans-serif" }}>
        <style>{`
          :root {
            --sans: var(--font-sans), "Outfit", "Helvetica Neue", sans-serif;
            --serif: var(--font-serif), "Newsreader", serif;
            --mono: var(--font-mono), "JetBrains Mono", monospace;
          }
        `}</style>
        {children}
      </body>
    </html>
  );
}
