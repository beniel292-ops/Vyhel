import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { Wordmark } from "@/components/site/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center">
        <Link href="/" aria-label="Vyhel home">
          <Wordmark />
        </Link>
      </header>
      <main id="main" className="container-page flex flex-1 flex-col justify-center pb-24">
        <p className="eyebrow">404 · Not found</p>
        <h1 className="display mt-4 max-w-2xl text-[3rem] text-ink md:text-[4.5rem]">This page isn&rsquo;t here.</h1>
        <p className="mt-4 max-w-md text-muted">
          It may have moved, been unpublished, or never existed. Here are some good places to start instead.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className={buttonClasses("primary", "lg")}>Go home</Link>
          <Link href="/products" className={buttonClasses("secondary", "lg")}>Browse products</Link>
          <Link href="/guides" className={buttonClasses("ghost", "lg")}>Read guides</Link>
        </div>
      </main>
    </div>
  );
}
