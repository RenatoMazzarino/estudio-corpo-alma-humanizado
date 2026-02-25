import Link from "next/link";

type LegalQuickLink = {
  href: string;
  label: string;
};

interface LegalDocumentShellProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  summary?: React.ReactNode;
  quickLinks?: LegalQuickLink[];
  children: React.ReactNode;
}

export default function LegalDocumentShell({
  title,
  subtitle,
  lastUpdated,
  summary,
  quickLinks,
  children,
}: LegalDocumentShellProps) {
  return (
    <div className="h-dvh overflow-y-auto overscroll-y-contain bg-stone-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
          <Link href="/" className="transition-colors hover:text-studio-green">
            Estudio Corpo & Alma Humanizado
          </Link>
          <span aria-hidden>•</span>
          <span>{subtitle}</span>
        </div>

        <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <header className="border-b border-stone-100 bg-linear-to-b from-stone-50 to-white px-5 py-6 sm:px-8 sm:py-8">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600">
                Documento legal
              </span>
              <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600">
                Atualizado em {lastUpdated}
              </span>
            </div>
            <h1 className="font-playfair text-3xl leading-tight text-stone-900 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
              {subtitle}. Leia este documento com atencao para entender direitos,
              responsabilidades, regras de uso e canais oficiais de contato.
            </p>
          </header>

          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              {summary ? (
                <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Resumo rapido
                  </h2>
                  <div className="text-sm leading-6 text-stone-700">{summary}</div>
                </section>
              ) : null}

              {quickLinks && quickLinks.length > 0 ? (
                <nav className="rounded-2xl border border-stone-200 bg-white p-4">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Navegacao rapida
                  </h2>
                  <ul className="space-y-1.5">
                    {quickLinks.map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className="block rounded-lg px-2 py-1.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-studio-green"
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}

              <section className="rounded-2xl border border-stone-200 bg-white p-4">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Uso em revisao de app
                </h2>
                <p className="text-sm leading-6 text-stone-700">
                  Estas paginas sao publicas e podem ser usadas como referencia em cadastros
                  e revisoes de plataformas (ex.: Meta/Facebook).
                </p>
              </section>
            </aside>

            <div className="min-w-0">
              <div className="prose prose-stone max-w-none prose-headings:font-playfair prose-headings:text-stone-900 prose-h2:mt-8 prose-h2:border-b prose-h2:border-stone-200 prose-h2:pb-2 prose-h3:mt-6 prose-h3:text-xl prose-p:leading-7 prose-p:text-stone-700 prose-li:text-stone-700 prose-strong:text-stone-900 prose-ul:pl-5 prose-ol:pl-5 prose-a:text-studio-green prose-a:no-underline hover:prose-a:underline">
                {children}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
