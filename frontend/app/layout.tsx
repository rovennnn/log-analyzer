import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { FileProvider } from "@/lib/FileContext";
import { TopNav } from "@/components/TopNav";

// Monospace dominates: this is log/tabular data, and a real fixed-width grid
// is what makes timestamps, status codes, and durations scannable in a
// column. IBM Plex Sans (same type superfamily) handles UI chrome only —
// nav, buttons, labels — so data and interface read as distinct registers
// without feeling like two unrelated typefaces bolted together.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "log-analyzer",
  description: "Ops dashboard for triaging application logs — traffic, errors, and slow endpoints.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexMono.variable} ${plexSans.variable}`}>
      <body className="min-h-screen bg-base font-sans text-text-primary">
        <FileProvider>
          <TopNav />
          <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">{children}</main>
        </FileProvider>
      </body>
    </html>
  );
}
