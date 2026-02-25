import Image from "next/image";
import { headers } from "next/headers";
import { AlertCircle, LogIn, ShieldCheck } from "lucide-react";
import { sanitizeDashboardNextPath } from "../../../src/modules/auth/dashboard-access";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
    reason?: string;
  }>;
};

function getReasonMessage(reason: string | null | undefined) {
  switch ((reason ?? "").trim()) {
    case "not_allowed":
      return "Esta conta Google ainda não está autorizada para acessar o painel do estúdio.";
    case "account_conflict":
      return "Esta conta já está vinculada a outro acesso. Use a conta Google correta ou fale com o suporte.";
    case "missing_email":
      return "Não foi possível identificar o e-mail da conta Google. Tente novamente.";
    case "oauth_error":
      return "Não foi possível iniciar o login com Google agora. Tente novamente.";
    case "dev_login_error":
      return "Não foi possível entrar com e-mail e senha. Confira os dados e tente novamente.";
    case "dev_login_disabled":
      return "O login de desenvolvimento por e-mail e senha está desabilitado neste ambiente.";
    case "system_error":
      return "Não foi possível validar seu acesso agora. Tente novamente em instantes.";
    case "signed_out":
      return "Você saiu do painel com segurança.";
    case "forbidden":
      return "Faça login para acessar esta área.";
    default:
      return "Entre com sua conta Google autorizada para acessar o painel.";
  }
}

function isDevPasswordLoginEnabled() {
  return (process.env.DEV_PASSWORD_LOGIN_ENABLED ?? "").trim().toLowerCase() === "true";
}

function isDevOrLocalHost(host: string | null | undefined) {
  const hostname = (host ?? "").trim().toLowerCase().split(":")[0] ?? "";
  if (!hostname) return false;
  if (hostname === "dev.public.corpoealmahumanizado.com.br") return true;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (hostname.endsWith(".vercel.app")) return true;
  return false;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const headerStore = await headers();
  const requestHost = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const next = sanitizeDashboardNextPath(params?.next, "/");
  const reasonMessage = getReasonMessage(params?.reason);
  const loginHref = `/auth/google${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  const devPasswordHref = `/auth/dev-login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  const isSignedOut = (params?.reason ?? "").trim() === "signed_out";
  const showDevPasswordLogin = isDevPasswordLoginEnabled() && isDevOrLocalHost(requestHost);

  return (
    <div className="app-viewport flex items-stretch justify-center overflow-hidden bg-neutral-900">
      <div className="app-frame relative overflow-hidden bg-studio-bg shadow-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-24 -left-16 h-56 w-56 rounded-full bg-studio-green/10 blur-3xl" />
          <div className="absolute top-28 -right-16 h-48 w-48 rounded-full bg-dom/10 blur-3xl" />
          <div className="absolute bottom-10 left-6 h-32 w-32 rounded-full bg-studio-green/5 blur-2xl" />
        </div>

        <div className="relative flex h-full flex-col px-4 pb-6 pt-6">
          <div className="safe-top safe-top-6 rounded-3xl border border-white/85 bg-white/95 p-5 shadow-soft backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-studio-light ring-1 ring-studio-green/10">
                <Image
                  src="/brand/icon.png"
                  alt="Logo Estúdio Corpo & Alma Humanizado"
                  width={28}
                  height={28}
                  className="h-7 w-7"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Login do painel</p>
                <h1 className="font-playfair text-[22px] font-semibold leading-tight text-studio-text">
                  Estúdio Corpo & Alma Humanizado
                </h1>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-studio-text">
              Entre com sua conta Google autorizada para acessar o painel do estúdio.
            </p>
          </div>

          <div className="mt-4 flex-1">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
              <div
                className={`rounded-2xl border px-4 py-3 ${
                  isSignedOut
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-line bg-paper text-studio-text"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isSignedOut ? (
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-studio-green" />
                  )}
                  <p className="text-sm leading-relaxed">{reasonMessage}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-studio-green/15 bg-studio-green/5 px-4 py-3">
                <p className="text-xs leading-relaxed text-studio-text">
                  Use apenas Google. Para Jana, entrar com{" "}
                  <strong className="text-studio-green">Janaina41santos@gmail.com</strong>.
                </p>
              </div>

              <a
                href={loginHref}
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-studio-green px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-lg shadow-green-900/20 transition active:scale-[0.99]"
              >
                <LogIn className="h-4 w-4" />
                Entrar com Google
              </a>

              {showDevPasswordLogin ? (
                <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                    Acesso de desenvolvimento (DEV/local)
                  </p>
                  <form action={devPasswordHref} method="post" className="mt-3 space-y-3">
                    <input type="hidden" name="next" value={next} />
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        E-mail
                      </span>
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-studio-text outline-none ring-0 focus:border-studio-green"
                        placeholder="seu-email@exemplo.com"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                        Senha
                      </span>
                      <input
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-studio-text outline-none ring-0 focus:border-studio-green"
                        placeholder="Senha do Supabase Auth"
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-studio-green/25 bg-white px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-studio-green transition active:scale-[0.99]"
                    >
                      Entrar com e-mail e senha (DEV)
                    </button>
                  </form>
                </div>
              ) : null}

              <p className="mt-4 text-center text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                Acesso somente para contas autorizadas
              </p>
            </div>
          </div>

          <div className="safe-bottom mt-4 px-1 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
            Painel interno do estúdio
          </div>
        </div>
      </div>
    </div>
  );
}
