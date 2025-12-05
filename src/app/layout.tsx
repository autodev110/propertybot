import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "PropertyBot | Real Estate Assistant",
  description: "Internal real estate buyer assistant CRM and email bot",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="PropertyBot logo" className="h-8 w-8 object-contain" />
              <div className="text-lg font-semibold text-slate-900">PropertyBot</div>
            </div>
            <nav className="space-x-4 text-sm">
              <a href="/search">Search</a>
              <a href="/clients">Clients</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
