import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DEMO_USER } from "@/lib/demo-user";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Legato · Forward deployments",
  description: "Connect Legato to the systems your finance team already runs.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={cn("font-sans", geist.variable, geistMono.variable)}
    >
      <body className="min-h-screen antialiased">
        <header className="border-b">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
            <div className="flex items-center gap-6">
              <Link href="/connectors" className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-4 rotate-45 rounded-[3px] bg-primary"
                />
                <span className="text-sm font-semibold tracking-widest">
                  LEGATO
                </span>
              </Link>
              <Separator orientation="vertical" className="h-5" />
              <nav className="flex items-center gap-1">
                <Button variant="ghost" size="sm" render={<Link href="/connectors" />}>
                  Connectors
                </Button>
                <Button variant="ghost" size="sm" render={<Link href="/agent" />}>
                  Agent
                </Button>
              </nav>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Logged in as</span>
              <Badge variant="secondary">
                {DEMO_USER.name} @ {DEMO_USER.org}
              </Badge>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 pb-10 text-xs text-muted-foreground">
          Legato Forward Deployments · internal demo
        </footer>
      </body>
    </html>
  );
}
