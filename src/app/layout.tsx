import { siteBaseUrl } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const instrument = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    metadataBase: new URL(siteBaseUrl()),
    title: { default: s.seoDefaultTitle, template: `%s — ${s.siteName}` },
    description: s.seoDefaultDescription,
    applicationName: s.siteName,
    openGraph: {
      type: "website",
      siteName: s.siteName,
      title: s.seoDefaultTitle,
      description: s.seoDefaultDescription,
      locale: "en_IN",
      ...(s.defaultOgImage ? { images: [s.defaultOgImage] } : {}),
    },
    twitter: { card: "summary_large_image" },
    verification: s.searchConsoleVerification ? { google: s.searchConsoleVerification } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${instrument.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
