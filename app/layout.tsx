import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { DEMO_USER } from "@/lib/demo-user";

export const metadata: Metadata = {
  title: "Legato · Forward deployments",
  description: "Connect Legato to the systems your finance team already runs.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-border bg-panel/60 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-8">
              <Link href="/connectors" className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block h-5 w-5 rotate-45 rounded-[3px] border border-accent"
                />
                <span className="wordmark text-lg font-semibold tracking-widest text-text">
                  LEGATO
                </span>
              </Link>
              <nav className="flex items-center gap-5 text-sm text-muted">
                <Link href="/connectors" className="hover:text-text">
                  Connectors
                </Link>
                <Link href="/agent" className="hover:text-text">
                  Agent
                </Link>
              </nav>
            </div>
            <div className="text-xs text-muted">
              Logged in as{" "}
              <span className="text-text">
                {DEMO_USER.name} @ {DEMO_USER.org}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-muted">
          Legato Forward Deployments · internal demo
        </footer>
      </body>
    </html>
  );
}
