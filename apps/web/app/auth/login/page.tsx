import Image from "next/image";
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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = sanitizeDashboardNextPath(params?.next, "/");
  const reasonMessage = getReasonMessage(params?.reason);
  const loginHref = `/auth/google${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`;
  const isSignedOut = (params?.reason ?? "").trim() === "signed_out";

  return (
    <div className="relative min-h-screen overflow-hidden bg-studio-bg px-4 py-6">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 -left-16 h-56 w-56 rounded-full bg-studio-green/10 blur-3xl" />
        <div className="absolute top-32 -right-12 h-44 w-44 rounded-full bg-dom/10 blur-3xl" />
        <div className="absolute bottom-8 left-8 h-32 w-32 rounded-full bg-studio-green/5 blur-2xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <div className="w-full overflow-hidden rounded-[30px] border border-white/80 bg-white shadow-float">
          <div className="relative border-b border-line bg-gradient-to-br from-studio-green to-studio-green/90 px-6 pb-6 pt-7 text-white">
            <div className="absolute inset-x-0 top-0 h-16 bg-white/5" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                <Image src="/brand/icon.png" alt="Estúdio Corpo & Alma" width={28} height={28} className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/80">Painel do estúdio</p>
                <h1 className="truncate font-playfair text-[26px] font-semibold leading-tight">Corpo & Alma</h1>
              </div>
            </div>
            <p className="relative mt-4 text-sm leading-relaxed text-white/90">
              Acesso privado do estúdio. Entre com Google para continuar no painel.
            </p>
          </div>

          <div className="space-y-4 p-6">
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

            <div className="rounded-2xl border border-studio-green/15 bg-studio-green/5 px-4 py-3">
              <p className="text-xs leading-relaxed text-studio-text">
                Use <strong className="text-studio-green">apenas login com Google</strong>. Jana: entrar com o e-mail{" "}
                <strong className="text-studio-green">Janaina41santos@gmail.com</strong>.
              </p>
            </div>

            <a
              href={loginHref}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-studio-green px-4 text-sm font-extrabold uppercase tracking-[0.12em] text-white shadow-lg shadow-green-900/20 transition active:scale-[0.99]"
            >
              <LogIn className="h-4 w-4" />
              Entrar com Google
            </a>

            <p className="text-center text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              Acesso liberado somente para contas autorizadas
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
