import Script from "next/script";
import { Footer } from "@/components/site/Footer";
import { Navbar } from "@/components/site/Navbar";
import { PageViewTracker } from "@/components/site/Analytics";
import { SearchDialog } from "@/components/site/SearchDialog";
import { getSettings } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const ga = /^G-[A-Z0-9]+$/.test(settings.googleAnalyticsId) ? settings.googleAnalyticsId : null;
  return (
    <>
      <Navbar />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer settings={settings} />
      <SearchDialog />
      <PageViewTracker />
      {ga ? (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}',{anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
    </>
  );
}
