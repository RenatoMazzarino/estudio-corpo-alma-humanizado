"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  ClipboardList,
  Dot,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Chip } from "../../../../components/ui/chip";
import { ModuleHeader } from "../../../../components/ui/module-header";
import { ModulePage } from "../../../../components/ui/module-page";
import { SurfaceCard } from "../../../../components/ui/surface-card";
import {
  backPoints,
  defaultSelectedKeys,
  frontPoints,
  getIntensityLabel,
  getPointScale,
  timeline,
  type BodyPoint,
  type BodyView,
  type PathId,
  type RegionKey,
  type ScreenId,
} from "./bodymap-shared";

const PatientsBodymap3DPreview = dynamic(
  () =>
    import("./patients-bodymap-3d-preview").then(
      (module) => module.PatientsBodymap3DPreview
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-105 items-center justify-center rounded-4xl border border-line bg-studio-light text-sm font-bold text-muted">
        Carregando cena 3D...
      </div>
    ),
  }
);

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
  accentClassName: string;
  selectedClassName: string;
};

const pathConfigs: Record<PathId, PathConfig> = {
  svg: {
    id: "svg",
    label: "SVG com hotspots",
    short: "Ilustração + pontos clínicos",
    badge: "Leitura mais leve",
    tone: "success",
    summary:
      "Uma ilustração elegante com pontos de dor/tensão. É rápida de operar e boa para atendimento corrido.",
    rationale:
      "Visualmente mais delicado e fácil de usar. O foco aqui é rapidez com um mapa mais editorial e menos técnico.",
    attendanceTitle: "Hotspots leves sobre a silhueta",
    recordTitle: "Prontuário com leitura visual suave",
    accentClassName: "bg-studio-light text-studio-green",
    selectedClassName: "border-studio-green bg-studio-green text-white",
  },
  "segmented-svg": {
    id: "segmented-svg",
    label: "SVG segmentado",
    short: "Áreas clínicas preenchidas",
    badge: "Base mais reaproveitável",
    tone: "warning",
    summary:
      "Regiões reais clicáveis preenchidas no corpo. É a opção mais direta para evoluir junto com o app mobile.",
    rationale:
      "Aqui o mapa já se comporta como componente de produto, com regiões nomeadas e estrutura mais profissional para web, já desenhado para portar depois ao mobile sem retrabalho conceitual.",
    attendanceTitle: "Áreas anatômicas segmentadas",
    recordTitle: "Prontuário por regiões clínicas",
    accentClassName: "bg-[#fff3e7] text-[#9b6c3f]",
    selectedClassName: "border-[#d4a373] bg-[#d4a373] text-white",
  },
  "3d": {
    id: "3d",
    label: "3D interativo",
    short: "Preview de futuro premium",
    badge: "Sem token, já navegável",
    tone: "default",
    summary:
      "Mostra como o módulo pode ganhar profundidade visual no futuro, com rotação e clique em volumes do corpo.",
    rationale:
      "Não substitui o 2D do curto prazo, mas já deixa claro como a mesma base clínica pode evoluir para uma visão tridimensional.",
    attendanceTitle: "Corpo 3D com rotação e destaque por região",
    recordTitle: "Prontuário com caminho claro para evolução 3D",
    accentClassName: "bg-[#eef1ef] text-studio-text",
    selectedClassName: "border-studio-text bg-studio-text text-white",
  },
};

const silhouettePathFront =
  "M108 34c-16 0-28 13-28 28 0 12 6 22 15 27v18c-17 5-36 13-48 22L27 221c-3 15 5 30 19 34l6 1c3 1 6 0 7-3l16-58 6 132-23 127h34l21-111h22l21 111h34l-23-127 6-132 16 58c1 3 4 4 7 3l6-1c14-4 22-19 19-34l-20-92c-12-9-31-17-48-22V89c9-5 15-15 15-27 0-15-12-28-28-28Z";

const silhouettePathBack =
  "M108 34c-16 0-28 13-28 28 0 12 6 22 15 27v14c-17 7-35 15-47 25l-18 88c-3 15 4 29 18 33l8 3c3 1 6-1 7-4l15-53 7 124-25 135h34l20-108h22l20 108h34l-25-135 7-124 15 53c1 3 4 5 7 4l8-3c14-4 21-18 18-33l-18-88c-12-10-30-18-47-25V89c9-5 15-15 15-27 0-15-12-28-28-28Z";

function getSortedSelectedPoints(view: BodyView, selectedKeys: Set<RegionKey>) {
  const points = view === "front" ? frontPoints : backPoints;
  return points.filter((point) => selectedKeys.has(point.key));
}

function BodySilhouette({ view }: { view: BodyView }) {
  return (
    <svg viewBox="0 0 216 520" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`silhouette-${view}`} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#AAB2AB" />
          <stop offset="100%" stopColor="#8E9991" />
        </linearGradient>
      </defs>
      <path
        d={view === "front" ? silhouettePathFront : silhouettePathBack}
        fill={`url(#silhouette-${view})`}
      />
      {view === "back" ? (
        <path
          d="M108 123v125"
          stroke="#7E8C84"
          strokeLinecap="round"
          strokeWidth="5"
          opacity="0.4"
        />
      ) : null}
    </svg>
  );
}

function HotspotBodyMap({
  view,
  selectedKeys,
  onToggle,
}: {
  view: BodyView;
  selectedKeys: Set<RegionKey>;
  onToggle: (key: RegionKey) => void;
}) {
  const points = view === "front" ? frontPoints : backPoints;

  return (
    <div className="rounded-4xl border border-studio-green/10 bg-[linear-gradient(180deg,#ffffff_0%,#f7f2ea_100%)] p-4">
      <div className="text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#9b6c3f]">
        {view === "front" ? "Vista frontal" : "Vista posterior"}
      </div>
      <div className="relative mx-auto mt-5 h-80 w-44">
        <BodySilhouette view={view} />
        {points.map((point) => {
          const selected = selectedKeys.has(point.key);
          return (
            <button
              key={point.key}
              type="button"
              onClick={() => onToggle(point.key)}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ top: point.top, left: point.left }}
              aria-label={`Alternar ${point.label}`}
              title={`${point.label} · ${getIntensityLabel(point.intensity)}`}
            >
              <span
                className={`absolute inset-0 rounded-full blur-md transition ${
                  selected ? "bg-[#dca86c]/55" : "bg-white/70"
                } ${getPointScale(point.intensity)}`}
              />
              <span
                className={`relative flex items-center justify-center rounded-full border-2 transition ${getPointScale(
                  point.intensity
                )} ${
                  selected
                    ? "border-[#dca86c] bg-[#dca86c] text-white shadow-[0_10px_25px_rgba(220,168,108,0.35)]"
                    : "border-white bg-white text-[#dca86c]"
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SegmentedBodyMap({
  view,
  selectedKeys,
  onToggle,
}: {
  view: BodyView;
  selectedKeys: Set<RegionKey>;
  onToggle: (key: RegionKey) => void;
}) {
  const front = view === "front";
  const bodyPath = front ? silhouettePathFront : silhouettePathBack;

  const fillFor = (key: RegionKey, base: string) =>
    selectedKeys.has(key) ? base : "rgba(255,255,255,0.12)";

  return (
    <div className="rounded-4xl border border-[#d4a373]/18 bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] p-4">
      <div className="text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#9b6c3f]">
        {front ? "Segmentação frontal" : "Segmentação posterior"}
      </div>
      <div className="mx-auto mt-4 h-80 w-44">
        <svg width="100%" height="100%" viewBox="0 0 216 520" aria-hidden>
          <defs>
            <linearGradient id="body-shell" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#E4E0D9" />
              <stop offset="100%" stopColor="#D8D3CB" />
            </linearGradient>
          </defs>
          <path d={bodyPath} fill="url(#body-shell)" />

          {front ? (
            <>
              <ellipse
                cx="108"
                cy="115"
                rx="16"
                ry="18"
                fill={fillFor("cervical", "rgba(214,132,87,0.92)")}
              />
              <path
                d="M58 138c-11 8-18 18-20 34 9 10 18 14 29 14 12-9 18-24 18-41-8-7-16-10-27-7Z"
                fill={fillFor("ombro-e", "rgba(233,173,109,0.95)")}
              />
              <path
                d="M158 138c11 8 18 18 20 34-9 10-18 14-29 14-12-9-18-24-18-41 8-7 16-10 27-7Z"
                fill={fillFor("ombro-d", "rgba(233,173,109,0.95)")}
              />
              <ellipse
                cx="108"
                cy="172"
                rx="33"
                ry="30"
                fill={fillFor("torax", "rgba(230,153,108,0.9)")}
              />
              <rect
                x="80"
                y="204"
                width="56"
                height="58"
                rx="24"
                fill={fillFor("abdomen", "rgba(212,163,115,0.88)")}
              />
              <ellipse
                cx="90"
                cy="286"
                rx="20"
                ry="24"
                fill={fillFor("quadril-e", "rgba(187,138,116,0.92)")}
              />
              <ellipse
                cx="126"
                cy="286"
                rx="20"
                ry="24"
                fill={fillFor("quadril-d", "rgba(187,138,116,0.92)")}
              />
            </>
          ) : (
            <>
              <rect
                x="92"
                y="112"
                width="32"
                height="20"
                rx="10"
                fill={fillFor("cervical", "rgba(214,132,87,0.92)")}
              />
              <path
                d="M55 141c-11 8-15 18-15 31 12 8 24 10 35 4 7-11 7-24 4-37-7-3-15-2-24 2Z"
                fill={fillFor("ombro-e", "rgba(233,173,109,0.95)")}
              />
              <path
                d="M161 141c11 8 15 18 15 31-12 8-24 10-35 4-7-11-7-24-4-37 7-3 15-2 24 2Z"
                fill={fillFor("ombro-d", "rgba(233,173,109,0.95)")}
              />
              <rect
                x="67"
                y="152"
                width="82"
                height="88"
                rx="34"
                fill={fillFor("dorsal", "rgba(108,140,151,0.92)")}
              />
              <rect
                x="77"
                y="240"
                width="62"
                height="36"
                rx="18"
                fill={fillFor("lombar", "rgba(82,109,120,0.95)")}
              />
              <ellipse
                cx="91"
                cy="292"
                rx="21"
                ry="25"
                fill={fillFor("quadril-e", "rgba(187,138,116,0.92)")}
              />
              <ellipse
                cx="125"
                cy="292"
                rx="21"
                ry="25"
                fill={fillFor("quadril-d", "rgba(187,138,116,0.92)")}
              />
            </>
          )}

          <circle cx="108" cy="63" r="28" fill="rgba(149,160,155,0.85)" />
        </svg>

        <div className="pointer-events-none absolute inset-0">
          {(front
            ? [
                { key: "cervical", top: "23%", left: "50%", w: "32px", h: "36px" },
                { key: "ombro-e", top: "31%", left: "31%", w: "42px", h: "52px" },
                { key: "ombro-d", top: "31%", left: "69%", w: "42px", h: "52px" },
                { key: "torax", top: "42%", left: "50%", w: "68px", h: "60px" },
                { key: "abdomen", top: "56%", left: "50%", w: "58px", h: "62px" },
                { key: "quadril-e", top: "74%", left: "40%", w: "42px", h: "48px" },
                { key: "quadril-d", top: "74%", left: "60%", w: "42px", h: "48px" },
              ]
            : [
                { key: "cervical", top: "22%", left: "50%", w: "34px", h: "24px" },
                { key: "ombro-e", top: "31%", left: "31%", w: "44px", h: "52px" },
                { key: "ombro-d", top: "31%", left: "69%", w: "44px", h: "52px" },
                { key: "dorsal", top: "44%", left: "50%", w: "84px", h: "92px" },
                { key: "lombar", top: "60%", left: "50%", w: "66px", h: "38px" },
                { key: "quadril-e", top: "76%", left: "41%", w: "44px", h: "48px" },
                { key: "quadril-d", top: "76%", left: "59%", w: "44px", h: "48px" },
              ]
          ).map((region) => (
            <button
              key={region.key}
              type="button"
              onClick={() => onToggle(region.key as RegionKey)}
              className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-transparent bg-transparent"
              style={{
                top: region.top,
                left: region.left,
                width: region.w,
                height: region.h,
              }}
              aria-label={`Alternar região ${region.key}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function RegionList({
  points,
  selectedKeys,
  accentClassName,
}: {
  points: BodyPoint[];
  selectedKeys: Set<RegionKey>;
  accentClassName: string;
}) {
  return (
    <div className="rounded-3xl border border-line bg-white p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted">
        Regiões em foco
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
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold ${accentClassName}`}
                >
                  <Dot className="h-4 w-4" />
                  {getIntensityLabel(point.intensity)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PatientsBodymapPathsDemo() {
  const [path, setPath] = useState<PathId>("svg");
  const [screen, setScreen] = useState<ScreenId>("attendance");
  const [view, setView] = useState<BodyView>("front");
  const [selectedKeys, setSelectedKeys] = useState<Set<RegionKey>>(
    () => new Set(defaultSelectedKeys)
  );

  const config = pathConfigs[path];
  const visiblePoints = useMemo(
    () => getSortedSelectedPoints(view, selectedKeys),
    [selectedKeys, view]
  );

  const allVisiblePoints = view === "front" ? frontPoints : backPoints;

  const toggleKey = (key: RegionKey) => {
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
          title="Comparador de mapa corporal"
          subtitle="Agora com implementações realmente diferentes: hotspots, SVG segmentado e preview 3D."
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
            Foco na aparência do corpo e na interatividade real
          </h2>
          <p className="mt-2 text-sm leading-6 text-studio-text/80">
            O objetivo desta página é comparar como o corpo aparece e como ele
            responde ao toque em três abordagens que têm caminho de reuso no
            mobile. O conteúdo ao redor foi reduzido para não competir com o mapa.
          </p>
        </SurfaceCard>

        <SurfaceCard>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Escolha da abordagem
          </p>
          <div className="mt-3 grid gap-3">
            {(Object.values(pathConfigs) as PathConfig[]).map((option) => {
              const active = option.id === path;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPath(option.id)}
                  className={`rounded-4xl border p-4 text-left transition ${
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

        <div className="grid grid-cols-2 gap-2 rounded-3xl border border-line bg-white p-1 shadow-soft">
          {([
            ["front", "Frente"],
            ["back", "Costas"],
          ] as const).map(([option, label]) => {
            const active = view === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
                  active ? "bg-studio-green text-white shadow-soft" : "text-muted"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <SurfaceCard>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Tela simulada
          </p>
          <h3 className="mt-1 text-xl font-serif font-bold text-studio-text">
            {screen === "attendance"
              ? config.attendanceTitle
              : config.recordTitle}
          </h3>
          <p className="mt-2 text-sm leading-6 text-studio-text/80">
            {config.rationale}
          </p>
        </SurfaceCard>

        {path === "svg" ? (
          <HotspotBodyMap
            view={view}
            selectedKeys={selectedKeys}
            onToggle={toggleKey}
          />
        ) : null}

        {path === "segmented-svg" ? (
          <SegmentedBodyMap
            view={view}
            selectedKeys={selectedKeys}
            onToggle={toggleKey}
          />
        ) : null}

        {path === "3d" ? (
          <PatientsBodymap3DPreview
            view={view}
            selectedKeys={[...selectedKeys]}
            onToggleAction={toggleKey}
          />
        ) : null}

        <RegionList
          points={allVisiblePoints}
          selectedKeys={selectedKeys}
          accentClassName={config.accentClassName}
        />

        {screen === "attendance" ? (
          <>
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
                Cliente chega com maior tensão em região cervical, ombros e
                lombar. A Jana marca regiões críticas no corpo, registra
                intensidade e mantém campo livre para percepção manual, formando
                um prontuário que continua útil no web, no mobile e no futuro 3D.
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {visiblePoints.map((point) => (
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
                    "Combinar mapa corporal com evolução textual e checar respiração, quadril e trapézio a cada retorno.",
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
            Leitura da opção ativa
          </p>
          <h3 className="mt-1 text-lg font-serif font-bold text-studio-text">
            {config.label}
          </h3>
          <p className="mt-3 text-sm leading-6 text-studio-text/80">
            {config.summary}
          </p>
        </SurfaceCard>
      </div>
    </ModulePage>
  );
}
