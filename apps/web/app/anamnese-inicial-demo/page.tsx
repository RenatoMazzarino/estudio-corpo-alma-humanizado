"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, HeartPulse, ShieldAlert, Sparkles, UserRound } from "lucide-react";

type StepKey = "identificacao" | "objetivo" | "saude" | "corpo" | "preferencias" | "termos";

type FormState = {
  nome: string;
  nascimento: string;
  whatsapp: string;
  email: string;
  cpf: string;
  profissao: string;
  cidade: string;
  comoConheceu: string;
  objetivoPrincipal: string;
  queixaPrincipal: string;
  inicioQueixa: string;
  intensidadeDor: string;
  acompanhamentoMedico: string;
  historicoSaude: string;
  medicamentos: string;
  alergias: string;
  cirurgiaRecente: string;
  gestante: string;
  hipertensao: boolean;
  diabetes: boolean;
  trombose: boolean;
  varizesDolorosas: boolean;
  cancerOuTratamento: boolean;
  febreOuInfeccao: boolean;
  lesaoRecente: boolean;
  problemaPele: boolean;
  areas: string[];
  sintomas: string[];
  observacoesCorpo: string;
  pressaoPreferida: string;
  areasEvitar: string;
  aromosensibilidade: string;
  posicaoDesconfortavel: string;
  objetivoSessao: string;
  autorizacaoContato: boolean;
  cienciaInformacoes: boolean;
  consentimentoAtendimento: boolean;
};

const STORAGE_KEY = "estudio-corpo-alma-anamnese-demo-v1";
const STEPS: { key: StepKey; title: string; eyebrow: string; subtitle: string }[] = [
  { key: "identificacao", title: "Seus dados", eyebrow: "Etapa 1", subtitle: "Informações básicas para o cadastro inicial." },
  { key: "objetivo", title: "Objetivo do cuidado", eyebrow: "Etapa 2", subtitle: "Entender o que você busca e como está se sentindo hoje." },
  { key: "saude", title: "Saúde e segurança", eyebrow: "Etapa 3", subtitle: "Perguntas rápidas para tornar o atendimento seguro e personalizado." },
  { key: "corpo", title: "Mapa das queixas", eyebrow: "Etapa 4", subtitle: "Marque as regiões e sintomas mais importantes." },
  { key: "preferencias", title: "Preferências do atendimento", eyebrow: "Etapa 5", subtitle: "Ajustes finos para deixar o atendimento mais confortável." },
  { key: "termos", title: "Confirmações finais", eyebrow: "Etapa 6", subtitle: "Últimas confirmações antes de enviar a ficha." },
];

const BODY_AREAS = [
  "Cabeça", "Cervical", "Ombros", "Braços", "Punhos e mãos", "Dorsal", "Lombar", "Quadril", "Glúteos", "Coxas", "Joelhos", "Panturrilhas", "Tornozelos", "Pés e pernas",
];
const SYMPTOMS = ["Dor", "Tensão", "Peso nas pernas", "Inchaço", "Sensibilidade", "Formigamento", "Cansaço", "Rigidez", "Queimação", "Limitação de movimento"];

const INITIAL_STATE: FormState = {
  nome: "",
  nascimento: "",
  whatsapp: "",
  email: "",
  cpf: "",
  profissao: "",
  cidade: "",
  comoConheceu: "",
  objetivoPrincipal: "",
  queixaPrincipal: "",
  inicioQueixa: "",
  intensidadeDor: "5",
  acompanhamentoMedico: "",
  historicoSaude: "",
  medicamentos: "",
  alergias: "",
  cirurgiaRecente: "",
  gestante: "",
  hipertensao: false,
  diabetes: false,
  trombose: false,
  varizesDolorosas: false,
  cancerOuTratamento: false,
  febreOuInfeccao: false,
  lesaoRecente: false,
  problemaPele: false,
  areas: [],
  sintomas: [],
  observacoesCorpo: "",
  pressaoPreferida: "moderada",
  areasEvitar: "",
  aromosensibilidade: "",
  posicaoDesconfortavel: "",
  objetivoSessao: "",
  autorizacaoContato: true,
  cienciaInformacoes: false,
  consentimentoAtendimento: false,
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[12px] font-semibold text-[#0B1C13]">{label}</div>
      {hint ? <div className="mt-1 text-[11px] text-[#7B8480]">{hint}</div> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("h-12 w-full rounded-2xl border border-[#E7EAE6] bg-white px-4 text-[14px] text-[#0B1C13] outline-none transition focus:border-[#0B1C13]", props.className)} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn("min-h-27 w-full rounded-2xl border border-[#E7EAE6] bg-white px-4 py-3 text-[14px] text-[#0B1C13] outline-none transition focus:border-[#0B1C13]", props.className)} />;
}

function ToggleChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-[18px] border px-3 py-2 text-left text-[12px] font-medium transition", active ? "border-[#0B1C13] bg-[#0B1C13] text-white" : "border-[#E7EAE6] bg-white text-[#0B1C13]")}>
      {children}
    </button>
  );
}

export default function AnamneseInicialDemoPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setForm({ ...INITIAL_STATE, ...JSON.parse(saved) });
      } catch {
        // Ignore invalid localStorage payload for this demo page.
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const step = STEPS[Math.min(stepIndex, STEPS.length - 1)]!;
  const nextDisabled = useMemo(() => {
    if (step.key === "identificacao") return !form.nome || !form.whatsapp || !form.nascimento;
    if (step.key === "objetivo") return !form.objetivoPrincipal || !form.queixaPrincipal;
    if (step.key === "termos") return !form.cienciaInformacoes || !form.consentimentoAtendimento;
    return false;
  }, [form, step.key]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleArray = (key: "areas" | "sintomas", value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((item) => item !== value) : [...prev[key], value],
    }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  };

  return (
    <div className="min-h-screen bg-[#F3F1EA] px-4 py-8 text-[#0B1C13]">
      <div className="mx-auto max-w-190">
        <div className="overflow-hidden rounded-4xl border border-[#E9ECE7] bg-[#FCFAF6] shadow-[0_24px_60px_-32px_rgba(11,28,19,.28)]">
          <div className="border-b border-[#ECEEEA] px-5 py-5 sm:px-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A928D]">Estúdio Corpo & Alma Humanizado</div>
                <h1 className="mt-2 font-serif text-[34px] leading-none text-[#0B1C13]">Ficha inicial da cliente</h1>
                <p className="mt-3 max-w-130 text-[13px] leading-6 text-[#69716D]">Pensamos essa anamnese para ser completa sem ficar cansativa. Leva poucos minutos e ajuda a Jana a preparar um atendimento muito mais seguro e personalizado.</p>
              </div>
              <div className="hidden rounded-[20px] border border-[#ECEEEA] bg-white px-4 py-3 text-right sm:block">
                <div className="text-[10px] uppercase tracking-[0.12em] text-[#8A928D]">Progresso</div>
                <div className="mt-1 text-[20px] font-semibold text-[#0B1C13]">{progress}%</div>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#EEECE6]"><div className="h-full rounded-full bg-[#0B1C13] transition-all" style={{ width: `${progress}%` }} /></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {STEPS.map((item, index) => (
                <div key={item.key} className={cn("rounded-full px-3 py-1.5 text-[11px] font-semibold", index === stepIndex ? "bg-[#0B1C13] text-white" : index < stepIndex ? "bg-[#E7EFE8] text-[#0B1C13]" : "bg-[#F2F0EA] text-[#7D8581]")}>{item.title}</div>
              ))}
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7">
            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4EFE5] text-[#0B1C13]">
                {step.key === "identificacao" ? <UserRound className="h-5 w-5" /> : step.key === "saude" ? <ShieldAlert className="h-5 w-5" /> : step.key === "corpo" ? <HeartPulse className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A928D]">{step.eyebrow}</div>
                <h2 className="mt-1 text-[22px] font-semibold text-[#0B1C13]">{step.title}</h2>
                <p className="mt-1 text-[13px] leading-6 text-[#6E7672]">{step.subtitle}</p>
              </div>
            </div>

            {step.key === "identificacao" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nome completo *"><TextInput value={form.nome} onChange={(e) => update("nome", e.target.value)} placeholder="Seu nome completo" /></FormField>
                <FormField label="Data de nascimento *"><TextInput type="date" value={form.nascimento} onChange={(e) => update("nascimento", e.target.value)} /></FormField>
                <FormField label="WhatsApp *"><TextInput value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} placeholder="(19) 99999-9999" /></FormField>
                <FormField label="E-mail"><TextInput type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="voce@email.com" /></FormField>
                <FormField label="CPF"><TextInput value={form.cpf} onChange={(e) => update("cpf", e.target.value)} placeholder="000.000.000-00" /></FormField>
                <FormField label="Profissão"><TextInput value={form.profissao} onChange={(e) => update("profissao", e.target.value)} placeholder="Sua atividade principal" /></FormField>
                <FormField label="Cidade / bairro"><TextInput value={form.cidade} onChange={(e) => update("cidade", e.target.value)} placeholder="Campinas • bairro" /></FormField>
                <FormField label="Como conheceu o estúdio?"><TextInput value={form.comoConheceu} onChange={(e) => update("comoConheceu", e.target.value)} placeholder="Instagram, indicação, Google..." /></FormField>
              </div>
            )}

            {step.key === "objetivo" && (
              <div className="space-y-4">
                <FormField label="O que você busca com esse atendimento? *" hint="Ex.: aliviar tensão, reduzir inchaço, relaxar, cuidar do lipedema, melhorar dores.">
                  <TextArea value={form.objetivoPrincipal} onChange={(e) => update("objetivoPrincipal", e.target.value)} placeholder="Conte com suas palavras o que você espera desse cuidado" />
                </FormField>
                <FormField label="Queixa principal de hoje *"><TextArea value={form.queixaPrincipal} onChange={(e) => update("queixaPrincipal", e.target.value)} placeholder="Onde incomoda mais e como isso aparece no seu dia a dia" /></FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Desde quando isso começou?"><TextInput value={form.inicioQueixa} onChange={(e) => update("inicioQueixa", e.target.value)} placeholder="Há dias, semanas, meses..." /></FormField>
                  <FormField label="Intensidade hoje (0 a 10)"><TextInput type="range" min="0" max="10" value={form.intensidadeDor} onChange={(e) => update("intensidadeDor", e.target.value)} className="px-0" /><div className="mt-2 text-[12px] text-[#6E7672]">Hoje você marcou <span className="font-semibold text-[#0B1C13]">{form.intensidadeDor}/10</span></div></FormField>
                </div>
                <FormField label="Você faz algum acompanhamento médico ou terapêutico relacionado a isso?"><TextArea value={form.acompanhamentoMedico} onChange={(e) => update("acompanhamentoMedico", e.target.value)} placeholder="Se sim, conte de forma simples" /></FormField>
              </div>
            )}

            {step.key === "saude" && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["hipertensao", "Hipertensão"],
                    ["diabetes", "Diabetes"],
                    ["trombose", "Histórico de trombose"],
                    ["varizesDolorosas", "Varizes dolorosas"],
                    ["cancerOuTratamento", "Câncer / tratamento oncológico"],
                    ["febreOuInfeccao", "Febre ou infecção atual"],
                    ["lesaoRecente", "Lesão ou cirurgia recente"],
                    ["problemaPele", "Problema de pele na área"],
                  ].map(([key, label]) => (
                    <ToggleChip key={key} active={Boolean(form[key as keyof FormState])} onClick={() => update(key as keyof FormState, !form[key as keyof FormState] as never)}>{label}</ToggleChip>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Uso atual de medicamentos"><TextArea value={form.medicamentos} onChange={(e) => update("medicamentos", e.target.value)} placeholder="Liste só o que achar importante" /></FormField>
                  <FormField label="Alergias, sensibilidades ou reações"><TextArea value={form.alergias} onChange={(e) => update("alergias", e.target.value)} placeholder="Produtos, óleos, aromas, fitas, tecidos..." /></FormField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Cirurgia, procedimento ou lesão recente"><TextArea value={form.cirurgiaRecente} onChange={(e) => update("cirurgiaRecente", e.target.value)} placeholder="Conte se houve algo recente importante" /></FormField>
                  <FormField label="Histórico geral de saúde"><TextArea value={form.historicoSaude} onChange={(e) => update("historicoSaude", e.target.value)} placeholder="Algo que a Jana precisa saber para cuidar melhor de você" /></FormField>
                </div>
                <FormField label="Gestação ou puerpério"><TextInput value={form.gestante} onChange={(e) => update("gestante", e.target.value)} placeholder="Se não se aplica, deixe em branco" /></FormField>
              </div>
            )}

            {step.key === "corpo" && (
              <div className="space-y-5">
                <div>
                  <div className="text-[12px] font-semibold text-[#0B1C13]">Quais regiões merecem mais atenção?</div>
                  <div className="mt-3 flex flex-wrap gap-2">{BODY_AREAS.map((area) => <ToggleChip key={area} active={form.areas.includes(area)} onClick={() => toggleArray("areas", area)}>{area}</ToggleChip>)}</div>
                </div>
                <div>
                  <div className="text-[12px] font-semibold text-[#0B1C13]">Quais sintomas você percebe mais?</div>
                  <div className="mt-3 flex flex-wrap gap-2">{SYMPTOMS.map((symptom) => <ToggleChip key={symptom} active={form.sintomas.includes(symptom)} onClick={() => toggleArray("sintomas", symptom)}>{symptom}</ToggleChip>)}</div>
                </div>
                <FormField label="Detalhes importantes sobre seu corpo hoje"><TextArea value={form.observacoesCorpo} onChange={(e) => update("observacoesCorpo", e.target.value)} placeholder="Ex.: lado direito pior, inchaço no fim do dia, cervical pior ao acordar..." /></FormField>
              </div>
            )}

            {step.key === "preferencias" && (
              <div className="space-y-5">
                <div>
                  <div className="text-[12px] font-semibold text-[#0B1C13]">Pressão preferida</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {([
                      ["leve", "Leve"],
                      ["moderada", "Moderada"],
                      ["firme", "Firme"],
                    ] as const).map(([value, label]) => <ToggleChip key={value} active={form.pressaoPreferida === value} onClick={() => update("pressaoPreferida", value)}>{label}</ToggleChip>)}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Áreas que prefere evitar"><TextArea value={form.areasEvitar} onChange={(e) => update("areasEvitar", e.target.value)} placeholder="Se houver alguma restrição ou desconforto" /></FormField>
                  <FormField label="Sensibilidade a aromas / produtos"><TextArea value={form.aromosensibilidade} onChange={(e) => update("aromosensibilidade", e.target.value)} placeholder="Ex.: não gosto de aromas fortes" /></FormField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Posição que te incomoda"><TextArea value={form.posicaoDesconfortavel} onChange={(e) => update("posicaoDesconfortavel", e.target.value)} placeholder="Ex.: barriga para baixo, muito tempo de lado..." /></FormField>
                  <FormField label="O que faria essa sessão valer muito a pena para você?"><TextArea value={form.objetivoSessao} onChange={(e) => update("objetivoSessao", e.target.value)} placeholder="Ex.: sair mais leve, dormir melhor, reduzir dor nas pernas..." /></FormField>
                </div>
              </div>
            )}

            {step.key === "termos" && (
              <div className="space-y-5">
                <div className="rounded-3xl border border-[#EAEDE8] bg-[#FFFEFC] p-4">
                  <div className="text-[13px] font-semibold text-[#0B1C13]">Resumo rápido da sua ficha</div>
                  <div className="mt-3 grid gap-2 text-[12px] text-[#5F6763] sm:grid-cols-2">
                    <div><span className="font-semibold text-[#0B1C13]">Nome:</span> {form.nome || "—"}</div>
                    <div><span className="font-semibold text-[#0B1C13]">WhatsApp:</span> {form.whatsapp || "—"}</div>
                    <div><span className="font-semibold text-[#0B1C13]">Objetivo:</span> {form.objetivoPrincipal || "—"}</div>
                    <div><span className="font-semibold text-[#0B1C13]">Áreas marcadas:</span> {form.areas.length ? form.areas.join(", ") : "—"}</div>
                  </div>
                </div>
                <label className="flex gap-3 rounded-[20px] border border-[#E7EAE6] bg-white p-4"><input type="checkbox" checked={form.autorizacaoContato} onChange={(e) => update("autorizacaoContato", e.target.checked)} className="mt-1 h-4 w-4" /><span className="text-[13px] leading-6 text-[#59615D]">Autorizo contato do estúdio para confirmação, orientação e acompanhamento do meu atendimento.</span></label>
                <label className="flex gap-3 rounded-[20px] border border-[#E7EAE6] bg-white p-4"><input type="checkbox" checked={form.cienciaInformacoes} onChange={(e) => update("cienciaInformacoes", e.target.checked)} className="mt-1 h-4 w-4" /><span className="text-[13px] leading-6 text-[#59615D]">Confirmo que as informações foram preenchidas por mim e estão corretas dentro do que sei hoje. *</span></label>
                <label className="flex gap-3 rounded-[20px] border border-[#E7EAE6] bg-white p-4"><input type="checkbox" checked={form.consentimentoAtendimento} onChange={(e) => update("consentimentoAtendimento", e.target.checked)} className="mt-1 h-4 w-4" /><span className="text-[13px] leading-6 text-[#59615D]">Estou ciente de que esta ficha é parte do meu acompanhamento terapêutico e concordo com seu uso para personalizar o atendimento. *</span></label>
              </div>
            )}
          </div>

          <div className="border-t border-[#ECEEEA] bg-[rgba(252,250,246,.98)] px-5 py-4 sm:px-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => (stepIndex === 0 ? null : setStepIndex(stepIndex - 1))} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[#E7EAE6] px-4 text-[13px] font-semibold", stepIndex === 0 ? "bg-[#F4F3EF] text-[#A0A7A3]" : "bg-white text-[#0B1C13]")}> <ChevronLeft className="h-4 w-4" /> Voltar</button>
              <div className="flex gap-3">
                <button type="button" onClick={() => { window.localStorage.removeItem(STORAGE_KEY); setForm(INITIAL_STATE); setStepIndex(0); setSubmitted(false); }} className="h-12 rounded-[18px] border border-[#E7EAE6] bg-white px-4 text-[13px] font-semibold text-[#0B1C13]">Limpar</button>
                {stepIndex < STEPS.length - 1 ? (
                  <button type="button" disabled={nextDisabled} onClick={() => setStepIndex(stepIndex + 1)} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-5 text-[13px] font-semibold text-white", nextDisabled ? "bg-[#BBC1BC]" : "bg-[#0B1C13]")}>Continuar <ChevronRight className="h-4 w-4" /></button>
                ) : (
                  <button type="button" disabled={nextDisabled} onClick={handleSubmit} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-[18px] px-5 text-[13px] font-semibold text-white", nextDisabled ? "bg-[#BBC1BC]" : "bg-[#0B1C13]")}>Enviar ficha <Check className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          </div>
        </div>

        {submitted && (
          <div className="mt-6 rounded-[28px] border border-[#DCE6DD] bg-[#F7FBF7] p-5 text-[#0B1C13] shadow-[0_18px_48px_-32px_rgba(11,28,19,.25)]">
            <div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6F1E7]"><Check className="h-5 w-5" /></div><div><div className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#5F8A67]">Ficha enviada em modo de teste</div><div className="mt-1 text-[20px] font-semibold">A experiência está pronta para a Jana validar</div><p className="mt-2 text-[13px] leading-6 text-[#5B655F]">Esse formulário está preparado para teste de usabilidade. O próximo passo técnico é ligar o envio a banco de dados, tenant e vínculo com cliente/agendamento.</p></div></div>
          </div>
        )}
      </div>
    </div>
  );
}
