import Link from "next/link";

interface LegalDocumentShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalDocumentShell({
  title,
  subtitle,
  lastUpdated,
  children,
}: LegalDocumentShellProps) {
  return (
    <div className="min-h-screen bg-stone-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          <Link href="/" className="hover:text-studio-green transition-colors">
            Estudio Corpo & Alma Humanizado
          </Link>
          <span aria-hidden>•</span>
          <span>{subtitle}</span>
        </div>

        <article className="rounded-3xl border border-stone-200 bg-white shadow-sm">
          <header className="border-b border-stone-100 px-5 py-6 sm:px-8 sm:py-8">
            <h1 className="font-playfair text-3xl leading-tight text-stone-900 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-sm text-stone-600">
              Ultima atualizacao: <strong>{lastUpdated}</strong>
            </p>
          </header>

          <div className="prose prose-stone max-w-none px-5 py-6 prose-headings:font-playfair prose-headings:text-stone-900 prose-p:text-stone-700 prose-li:text-stone-700 prose-strong:text-stone-900 sm:px-8 sm:py-8">
            {children}
          </div>
        </article>
      </div>
    </div>
  );
}

