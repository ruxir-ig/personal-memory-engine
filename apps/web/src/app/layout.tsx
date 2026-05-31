import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { nudica } from "./fonts/nudica";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Quipu - your second brain",
  description:
    "Quipu is a personal memory engine. Dump anything - links, reels, keys, notes, code - and it organizes itself into a living, AI-arranged canvas.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

const themeScript = `(()=>{try{const t=localStorage.getItem("quipu-theme")||localStorage.getItem("quipo-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" className={`${nudica.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
