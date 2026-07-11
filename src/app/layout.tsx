import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import AppHeader from "@/components/AppHeader";
import TemplateOnboarding from "@/components/TemplateOnboarding";
import { Providers } from "./providers";
import { THEME_NO_FLASH_SCRIPT } from "@/contexts/ThemeContext";
import "./globals.css";
import "./themes.css";
import "./effects.css";
import "./telos/_v7/styles.css";

export const metadata: Metadata = {
  title: "LifeOS Pulse",
  description: "LifeOS — the Life Operating System. Command center.",
  icons: {
    icon: "/lifeos-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="deep-space" className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_NO_FLASH_SCRIPT }} />
        <div className="pulse-ambient" aria-hidden="true" />
        <div className="pulse-grid" aria-hidden="true" />
        <Providers>
          <AppHeader />
          <TemplateOnboarding />
          {/* overflow-x-clip, never -hidden: hidden makes <main> a scroll container,
              which breaks position:sticky for anything inside (e.g. TelosSubnav). */}
          <main className="min-h-screen max-w-[1920px] mx-auto w-full overflow-x-clip relative">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
