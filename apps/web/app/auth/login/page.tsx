import { Lock, LogIn, Sparkles } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-studio-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-white bg-white p-6 shadow-soft">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-studio-green/10 text-studio-green">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted">Acesso ao painel</p>
            <h1 className="font-playfair text-2xl font-semibold text-studio-text">Estúdio Corpo & Alma</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper px-4 py-3">
          <p className="text-sm font-medium leading-relaxed text-studio-text">{reasonMessage}</p>
          <p className="mt-2 text-xs text-muted">
            O primeiro acesso já é vinculado automaticamente quando o e-mail estiver pré-autorizado.
          </p>
        </div>

        <a
          href={loginHref}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-studio-green px-4 text-sm font-extrabold uppercase tracking-wide text-white shadow-soft"
        >
          <LogIn className="h-4 w-4" />
          Entrar com Google
        </a>

        <div className="mt-4 rounded-2xl border border-studio-green/15 bg-studio-green/5 px-4 py-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-studio-green" />
            <p className="text-xs leading-relaxed text-studio-text">
              Acesso liberado apenas para contas Google autorizadas do estúdio. Se seu e-mail não entrar, peça para
              cadastrar o acesso.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
