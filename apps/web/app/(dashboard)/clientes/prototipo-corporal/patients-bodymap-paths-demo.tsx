"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  ClipboardList,
  Dot,
  Layers3,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Chip } from "../../../../components/ui/chip";
import { ModuleHeader } from "../../../../components/ui/module-header";
import { ModulePage } from "../../../../components/ui/module-page";
import { SurfaceCard } from "../../../../components/ui/surface-card";

type PathId = "svg" | "skia" | "ready";
type ScreenId = "attendance" | "record";
type BodyView = "front" | "back";

type BodyPoint = {
  key: string;
  label: string;
  top: string;
  left: string;
  intensity: "leve" | "moderada" | "alta";
  note: string;
};

type PathConfig = {
  id: PathId;
  label: string;
  short: string;
  badge: string;
  tone: "default" | "success" | "warning";
  summary: string;
  rationale: string;
  attendanceTitle: string;
  recordTitle: string;
  mapShellClassName: string;
  silhouetteClassName: string;
  selectedClassName: string;
  unselectedClassName: string;
  accentClassName: string;
  metrics: Array<{ label: string; value: string }>;
};

const pathConfigs: Record<PathId, PathConfig> = {
  svg: {
    id: "svg",
    label: "SVG próprio",
    short: "Base recomendada",
    badge: "Mais alinhado ao app nativo",
    tone: "success",
    summary:
      "Regiões clínicas próprias, visual consistente com o sistema e reuso direto quando o app do estúdio entrar no mobile.",
    rationale:
      "É o caminho mais seguro para sair do protótipo e virar módulo real sem retrabalho estrutural.",
    attendanceTitle: "Atendimento com registro rápido e clínico",
    recordTitle: "Prontuário longitudinal com regiões próprias",
    mapShellClassName:
      "border-studio-green/10 bg-[linear-gradient(180deg,#ffffff_0%,#f7f7f4_100%)]",
    silhouetteClassName: "border-studio-green/10 bg-gradient-to-b from-studio-light to-[#f7f4ef]",
    selectedClassName:
      "border-studio-green bg-studio-green text-white shadow-[0_12px_30px_rgba(93,110,86,0.22)]",
    unselectedClassName: "border-studio-green/15 bg-white text-studio-green",
    accentClassName: "bg-studio-light text-studio-green",
    metrics: [
      { label: "Aderência visual", value: "Alta" },
      { label: "Reuso mobile", value: "Direto" },
      { label: "Risco técnico", value: "Baixo" },
    ],
  },
  skia: {
    id: "skia",
    label: "Skia premium",
    short: "Visual mais rico",
    badge: "Melhor para heatmap e evolução",
    tone: "warning",
    summary:
      "Abre espaço para leitura de calor, tensão e evolução visual mais sofisticada sem mudar a base clínica.",
    rationale:
      "É o melhor passo quando quisermos elevar a experiência do app do estúdio sem partir ainda para o 3D.",
    attendanceTitle: "Atendimento com leitura visual mais expressiva",
    recordTitle: "Prontuário com camada de intensidade",
    mapShellClassName:
      "border-[#d4a373]/20 bg-[radial-gradient(circle_at_top,#fff7ed_0%,#fff_58%,#f6f4f1_100%)]",
    silhouetteClassName: "border-[#d4a373]/20 bg-gradient-to-b from-[#fff0de] to-[#fbf7f2]",
    selectedClassName:
      "border-[#d4a373] bg-[#d4a373] text-white shadow-[0_16px_34px_rgba(212,163,115,0.24)]",
    unselectedClassName: "border-[#d4a373]/20 bg-white text-[#9b6c3f]",
    accentClassName: "bg-[#fff3e7] text-[#9b6c3f]",
    metrics: [
      { label: "Aderência visual", value: "Alta" },
      { label: "Reuso mobile", value: "Bom" },
      { label: "Risco técnico", value: "Médio" },
    ],
  },
  ready: {
    id: "ready",
    label: "Componente pronto",
    short: "Mais rápido para testar",
    badge: "Bom só para spike web",
    tone: "default",
    summary:
      "É o caminho mais rápido para validar clique e fluxo, mas tende a pedir retrabalho quando o mobile virar prioridade real.",
    rationale:
      "Serve para prova rápida, não como fundação do módulo se queremos uma base profissional.",
    attendanceTitle: "Atendimento com ênfase em velocidade de teste",
    recordTitle: "Prontuário funcional, porém menos durável",
    mapShellClassName:
      "border-line bg-[linear-gradient(180deg,#ffffff_0%,#f5f8f7_100%)]",
    silhouetteClassName: "border-line bg-gradient-to-b from-[#f3f6f4] to-white",
    selectedClassName:
      "border-studio-text bg-studio-text text-white shadow-[0_14px_32px_rgba(44,51,51,0.18)]",
    unselectedClassName: "border-line bg-white text-studio-text",
    accentClassName: "bg-[#eef1ef] text-studio-text",
    metrics: [
      { label: "Aderência visual", value: "Média" },
      { label: "Reuso mobile", value: "Fraco" },
      { label: "Risco técnico", value: "Médio" },
    ],
  },
};

const frontPoints: BodyPoint[] = [
  {
    key: "cervical",
    label: "Cervical",
    top: "14%",
    left: "49%",
    intensity: "moderada",
    note: "Rigidez ao final do dia",
  },
  {
    key: "ombro-e",
    label: "Ombro E",
    top: "23%",
    left: "34%",
    intensity: "alta",
    note: "Tensão ao elevar o braço",
  },
  {
    key: "ombro-d",
    label: "Ombro D",
    top: "23%",
    left: "64%",
    intensity: "moderada",
    note: "Compensa postura no trabalho",
  },
  {
    key: "torax",
    label: "Peitoral",
    top: "31%",
    left: "49%",
    intensity: "leve",
    note: "Sensação de encurtamento",
  },
  {
    key: "abdomen",
    label: "Abdômen",
    top: "43%",
    left: "49%",
    intensity: "leve",
    note: "Respiração curta em estresse",
  },
  {
    key: "quadril-e",
    label: "Quadril E",
    top: "56%",
    left: "40%",
    intensity: "moderada",
    note: "Peso para o lado esquerdo",
  },
  {
    key: "quadril-d",
    label: "Quadril D",
    top: "56%",
    left: "58%",
    intensity: "leve",
    note: "Compensação leve",
  },
];

const backPoints: BodyPoint[] = [
  {
    key: "trapezio-e",
    label: "Trapézio E",
    top: "21%",
    left: "37%",
    intensity: "alta",
    note: "Ponto gatilho recorrente",
  },
  {
    key: "trapezio-d",
    label: "Trapézio D",
    top: "21%",
    left: "61%",
    intensity: "moderada",
    note: "Melhora parcial entre sessões",
  },
  {
    key: "dorsal",
    label: "Dorsal",
    top: "35%",
    left: "49%",
    intensity: "moderada",
    note: "Fáscia mais rígida",
  },
  {
    key: "lombar",
    label: "Lombar",
    top: "49%",
    left: "49%",
    intensity: "alta",
    note: "Principal queixa das últimas sessões",
  },
  {
    key: "gluteo-e",
    label: "Glúteo E",
    top: "59%",
    left: "42%",
    intensity: "moderada",
    note: "Irradiação para perna esquerda",
  },
  {
    key: "gluteo-d",
    label: "Glúteo D",
    top: "59%",
    left: "57%",
    intensity: "leve",
    note: "Estável",
  },
  {
    key: "panturrilha-e",
    label: "Panturrilha E",
    top: "82%",
    left: "44%",
    intensity: "leve",
    note: "Fadiga pós-corrida",
  },
  {
    key: "panturrilha-d",
    label: "Panturrilha D",
    top: "82%",
    left: "55%",
    intensity: "leve",
    note: "Sem agravamento",
  },
];

const defaultSelectedKeys = [
  "cervical",
  "ombro-e",
  "ombro-d",
  "trapezio-e",
  "trapezio-d",
  "lombar",
];

const timeline = [
  {
    date: "Hoje · Sessão 08",
    body: "Entrada rápida com mapa corporal, intensidade por região e campo livre para percepção da Jana.",
  },
  {
    date: "11 mar · Sessão 07",
    body: "Lombar caiu de alta para moderada após combinação de liberação miofascial e drenagem leve.",
  },
  {
    date: "04 mar · Sessão 06",
    body: "Ombro esquerdo voltou a piorar após semana intensa no computador.",
  },
];

function getPointScale(intensity: BodyPoint["intensity"]) {
  switch (intensity) {
    case "alta":
      return "h-6 w-6";
    case "moderada":
      return "h-5 w-5";
    default:
      return "h-4 w-4";
  }
}

function getIntensityLabel(intensity: BodyPoint["intensity"]) {
  switch (intensity) {
    case "alta":
      return "Alta";
    case "moderada":
      return "Moderada";
    default:
      return "Leve";
  }
}

function BodySilhouette({ view }: { view: BodyView }) {
  if (view === "front") {
    return (
      <svg viewBox="0 0 220 520" className="h-full w-full" aria-hidden>
        <g fill="currentColor" opacity="0.92">
          <circle cx="110" cy="40" r="28" />
          <path d="M76 94c8-15 23-24 34-24s26 9 34 24l11 45c6 25 7 49 3 74l-7 39c-2 12-3 23-3 35v61c0 16 7 49 14 97h-32l-12-86h-16l-12 86H58c7-48 14-81 14-97v-61c0-12-1-23-3-35l-7-39c-4-25-3-49 3-74z" />
          <path d="M55 118 28 218c-4 14 4 29 18 33l11 3 28-87-4-49z" />
          <path d="M165 118 192 218c4 14-4 29-18 33l-11 3-28-87 4-49z" />
          <path d="M84 447 66 512h30l14-60z" />
          <path d="M136 447 154 512h-30l-14-60z" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 520" className="h-full w-full" aria-hidden>
      <g fill="currentColor" opacity="0.92">
        <circle cx="110" cy="40" r="28" />
        <path d="M74 96c11-17 24-25 36-25s25 8 36 25l10 48c5 23 5 44 1 66l-11 52c-3 12-4 24-4 36v60c0 16 7 49 14 96h-29l-15-82h-8l-15 82H60c7-47 14-80 14-96v-60c0-12-1-24-4-36L59 210c-4-22-4-43 1-66z" />
        <path d="M56 120 26 231c-3 13 3 26 15 31l13 5 29-93-4-54z" />
        <path d="M164 120 194 231c3 13-3 26-15 31l-13 5-29-93 4-54z" />
        <path d="M85 450 68 512h28l13-58z" />
        <path d="M135 450 152 512h-28l-13-58z" />
      </g>
    </svg>
  );
}

function BodyMapCard({
  config,
  view,
  onChangeView,
  points,
  selectedKeys,
  onTogglePoint,
}: {
  config: PathConfig;
  view: BodyView;
  onChangeView: (next: BodyView) => void;
  points: BodyPoint[];
  selectedKeys: Set<string>;
  onTogglePoint: (key: string) => void;
}) {
  return (
    <SurfaceCard className={`border ${config.mapShellClassName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Mapa corporal
          </p>
          <h3 className="mt-1 text-lg font-serif font-bold text-studio-text">
            Leitura tátil e visual da sessão
          </h3>
        </div>
        <Chip tone={config.tone}>{config.badge}</Chip>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-3xl border border-line bg-white p-1">
        {([
          ["front", "Frente"],
          ["back", "Costas"],
        ] as const).map(([option, label]) => {
          const active = view === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChangeView(option)}
              className={`rounded-2xl px-4 py-2 text-sm font-extrabold transition ${
                active ? "bg-studio-green text-white shadow-soft" : "text-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        className={`relative mt-4 rounded-[28px] border p-4 ${config.silhouetteClassName}`}
      >
        <div className="text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
          {view === "front" ? "Vista frontal" : "Vista posterior"}
        </div>
        <div className="relative mx-auto mt-6 h-80 w-40 text-[#8f9a92]">
          <BodySilhouette view={view} />
          {points.map((point) => {
            const selected = selectedKeys.has(point.key);

            return (
              <button
                key={point.key}
                type="button"
                onClick={() => onTogglePoint(point.key)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition ${getPointScale(
                  point.intensity
                )} ${
                  selected ? config.selectedClassName : config.unselectedClassName
                }`}
                style={{ top: point.top, left: point.left }}
                title={`${point.label} · ${getIntensityLabel(point.intensity)}`}
                aria-label={`Alternar região ${point.label}`}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-line bg-white p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted">
          Regiões selecionadas
        </p>
        <p className="mt-1 text-2xl font-black text-studio-text tabular-nums">
          {selectedKeys.size}
        </p>
        <div className="mt-4 grid gap-2">
          {points.map((point) => {
            const selected = selectedKeys.has(point.key);

            return (
              <div
                key={point.key}
                className={`rounded-[22px] border p-3 transition ${
                  selected
                    ? "border-studio-green/20 bg-white shadow-sm"
                    : "border-line bg-studio-bg/70 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-studio-text">
                      {point.label}
                    </p>
                    <p className="text-[11px] leading-5 text-muted">{point.note}</p>
                  </div>
                  <Chip>{getIntensityLabel(point.intensity)}</Chip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SurfaceCard>
  );
}

export function PatientsBodymapPathsDemo() {
  const [path, setPath] = useState<PathId>("svg");
  const [screen, setScreen] = useState<ScreenId>("attendance");
  const [view, setView] = useState<BodyView>("back");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(defaultSelectedKeys)
  );

  const config = pathConfigs[path];
  const visiblePoints = view === "front" ? frontPoints : backPoints;

  const selectedPoints = useMemo(
    () =>
      [...frontPoints, ...backPoints].filter((point) => selectedKeys.has(point.key)),
    [selectedKeys]
  );

  const togglePoint = (key: string) => {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <ModulePage
      header={
        <ModuleHeader
          kicker="Clientes · Protótipo real"
          title="Comparador corporal 2D"
          subtitle="Rota interna para decidir a base visual do módulo Pacientes dentro da linguagem atual do app."
          rightSlot={
            <Link
              href="/clientes"
              aria-label="Voltar para clientes"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-studio-light text-studio-green transition hover:bg-studio-green hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
          }
        />
      }
      contentClassName="px-4 pb-6 pt-4"
    >
      <div className="flex flex-col gap-4">
        <SurfaceCard>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Decisão de produto
          </p>
          <h2 className="mt-1 text-xl font-serif font-bold text-studio-text">
            Uma base clínica, três caminhos visuais
          </h2>
          <p className="mt-2 text-sm leading-6 text-studio-text/80">
            Aqui a decisão não é só estética. O foco é encontrar uma solução que
            deixe a Jana rápida na sessão, combine com o sistema atual e não gere
            retrabalho quando o app do estúdio migrar para mobile nativo.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {config.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-line bg-studio-light/70 p-3"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted">
                  {metric.label}
                </p>
                <p className="mt-1 text-sm font-black text-studio-text">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Escolha do caminho
          </p>
          <div className="mt-3 grid gap-3">
            {(Object.values(pathConfigs) as PathConfig[]).map((option) => {
              const active = option.id === path;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPath(option.id)}
                  className={`rounded-[28px] border p-4 text-left transition ${
                    active
                      ? "border-studio-green bg-studio-light shadow-[0_18px_40px_rgba(93,110,86,0.12)]"
                      : "border-line bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-extrabold text-studio-text">
                        {option.label}
                      </p>
                      <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                        {option.short}
                      </p>
                    </div>
                    <Chip tone={option.tone}>{active ? "Ativo" : "Opção"}</Chip>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-studio-text/80">
                    {option.summary}
                  </p>
                </button>
              );
            })}
          </div>
        </SurfaceCard>

        <div className="grid grid-cols-2 gap-2 rounded-3xl border border-line bg-white p-1 shadow-soft">
          {([
            ["attendance", "Atendimento", ClipboardList],
            ["record", "Prontuário", BookOpenText],
          ] as const).map(([option, label, Icon]) => {
            const active = screen === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => setScreen(option)}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                  active ? "bg-studio-green text-white shadow-soft" : "text-muted"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {screen === "attendance" ? (
          <>
            <SurfaceCard>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                Tela simulada
              </p>
              <h3 className="mt-1 text-xl font-serif font-bold text-studio-text">
                {config.attendanceTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-studio-text/80">
                {config.rationale}
              </p>
            </SurfaceCard>

            <BodyMapCard
              config={config}
              view={view}
              onChangeView={setView}
              points={visiblePoints}
              selectedKeys={selectedKeys}
              onTogglePoint={togglePoint}
            />

            <SurfaceCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                    Anamnese rápida
                  </p>
                  <h3 className="mt-1 text-lg font-serif font-bold text-studio-text">
                    Entrada curta, mas clínica
                  </h3>
                </div>
                <WandSparkles className="h-5 w-5 text-studio-green" />
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  [
                    "Queixa do dia",
                    "Lombar pesada ao fim da tarde e ombro esquerdo mais rígido ao acordar.",
                  ],
                  [
                    "Gatilho percebido",
                    "Semana longa no computador e pouco intervalo.",
                  ],
                  [
                    "Técnica planejada",
                    "Liberação miofascial + drenagem leve + mobilização cervical suave.",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-line bg-studio-light/50 p-3"
                  >
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-studio-text">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                    Evolução combinada
                  </p>
                  <h3 className="mt-1 text-lg font-serif font-bold text-studio-text">
                    Texto livre + estrutura reutilizável
                  </h3>
                </div>
                <Sparkles className="h-5 w-5 text-[#d4a373]" />
              </div>

              <div className="mt-4 rounded-3xl border border-line bg-white p-4 text-sm leading-7 text-studio-text/85">
                Cliente chega com maior tensão em região cervical, trapézio
                esquerdo e lombar. A Jana marca regiões críticas no mapa,
                registra intensidade e mantém campo livre para percepção manual,
                facilitando o resumo estruturado do prontuário depois.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedPoints.slice(0, 6).map((point) => (
                  <span
                    key={point.key}
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold ${config.accentClassName}`}
                  >
                    <Dot className="h-4 w-4" />
                    {point.label}
                  </span>
                ))}
              </div>
            </SurfaceCard>
          </>
        ) : (
          <>
            <SurfaceCard className={`border ${config.mapShellClassName}`}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                Tela simulada
              </p>
              <h3 className="mt-1 text-xl font-serif font-bold text-studio-text">
                {config.recordTitle}
              </h3>
              <p className="mt-2 text-sm leading-6 text-studio-text/80">
                O prontuário deixa de ser um bloco solto por sessão e vira uma
                linha clínica que a Jana consulta antes, durante e depois do
                atendimento.
              </p>

              <div className="mt-4 rounded-[28px] border border-line bg-white/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                      Mapa consolidado
                    </p>
                    <p className="text-sm font-bold text-studio-text">
                      Regiões recorrentes dos últimos 60 dias
                    </p>
                  </div>
                  <Layers3 className="h-5 w-5 text-studio-green" />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="mx-auto h-70 w-35 text-[#8f9a92]">
                    <BodySilhouette view="front" />
                  </div>
                  <div className="mx-auto h-70 w-35 text-[#8f9a92]">
                    <BodySilhouette view="back" />
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {selectedPoints.slice(0, 6).map((point) => (
                    <div
                      key={point.key}
                      className="rounded-[20px] border border-line bg-white p-3"
                    >
                      <p className="text-sm font-extrabold text-studio-text">
                        {point.label}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        Recorrência{" "}
                        {getIntensityLabel(point.intensity).toLowerCase()} nas
                        últimas sessões.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard className="bg-studio-light/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                    Resumo clínico vivo
                  </p>
                  <h3 className="mt-1 text-lg font-serif font-bold text-studio-text">
                    O que a Jana precisa bater o olho e lembrar
                  </h3>
                </div>
                <ShieldCheck className="h-5 w-5 text-studio-green" />
              </div>

              <div className="mt-4 grid gap-3">
                {[
                  [
                    "Queixa principal",
                    "Lombar e cintura escapular com piora em semanas de estresse e muito computador.",
                  ],
                  [
                    "Padrão atual",
                    "A dor lombar responde bem à drenagem associada à liberação, mas o ombro esquerdo ainda reacende fácil.",
                  ],
                  [
                    "Conduta frequente",
                    "Combinar leitura do mapa com evolução textual e checar respiração, quadril e trapézio a cada retorno.",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-line bg-white p-3"
                  >
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted">
                      {label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-studio-text">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
                Linha do tempo clínica
              </p>
              <div className="mt-4 grid gap-3">
                {timeline.map((item) => (
                  <div
                    key={item.date}
                    className="rounded-[22px] border border-line bg-white p-4"
                  >
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted">
                      {item.date}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-studio-text/80">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
          </>
        )}

        <SurfaceCard>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Leitura do caminho ativo
          </p>
          <h3 className="mt-1 text-lg font-serif font-bold text-studio-text">
            {config.label}
          </h3>
          <p className="mt-3 text-sm leading-6 text-studio-text/80">
            {config.rationale}
          </p>

          <div className="mt-4 rounded-3xl border border-line bg-studio-light/50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-muted">
              Impacto na decisão
            </p>
            <p className="mt-2 text-sm leading-6 text-studio-text">
              {config.summary}
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            O que esta página ajuda a decidir
          </p>
          <div className="mt-3 space-y-3 text-sm leading-6 text-studio-text/85">
            <p>
              1. Qual visual deixa a Jana mais rápida em sessão sem sair da
              aparência do app.
            </p>
            <p>
              2. Qual caminho combina melhor com o futuro app Android do
              estúdio.
            </p>
            <p>
              3. Quanto valor clínico conseguimos gerar sem prender a
              arquitetura a uma biblioteca errada.
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard className="bg-studio-light/60">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Sugestão técnica atual
          </p>
          <p className="mt-3 text-sm leading-6 text-studio-text">
            Se eu tivesse que escolher hoje, iria de <strong>SVG próprio</strong>{" "}
            como base do módulo Pacientes e deixaria <strong>Skia</strong> como
            evolução premium futura.
          </p>
          <div className="mt-4 rounded-[22px] border border-line bg-white p-4 font-mono text-xs text-studio-text break-all">
            /clientes/prototipo-corporal
          </div>
        </SurfaceCard>
      </div>
    </ModulePage>
  );
}
