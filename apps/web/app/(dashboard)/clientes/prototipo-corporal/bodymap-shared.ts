export type PathId = "svg" | "segmented-svg" | "3d";
export type ScreenId = "attendance" | "record";
export type BodyView = "front" | "back";

export type RegionKey =
  | "cervical"
  | "ombro-e"
  | "ombro-d"
  | "torax"
  | "abdomen"
  | "dorsal"
  | "lombar"
  | "quadril-e"
  | "quadril-d";

export type BodyPoint = {
  key: RegionKey;
  label: string;
  top: string;
  left: string;
  intensity: "leve" | "moderada" | "alta";
  note: string;
};

export const defaultSelectedKeys: RegionKey[] = [
  "cervical",
  "ombro-e",
  "ombro-d",
  "dorsal",
  "lombar",
];

export const frontPoints: BodyPoint[] = [
  {
    key: "cervical",
    label: "Cervical",
    top: "15%",
    left: "50%",
    intensity: "moderada",
    note: "Rigidez ao final do dia",
  },
  {
    key: "ombro-e",
    label: "Ombro E",
    top: "24%",
    left: "34%",
    intensity: "alta",
    note: "Elevação com dor",
  },
  {
    key: "ombro-d",
    label: "Ombro D",
    top: "24%",
    left: "66%",
    intensity: "moderada",
    note: "Compensação postural",
  },
  {
    key: "torax",
    label: "Peitoral",
    top: "33%",
    left: "50%",
    intensity: "leve",
    note: "Sensação de encurtamento",
  },
  {
    key: "abdomen",
    label: "Abdômen",
    top: "45%",
    left: "50%",
    intensity: "leve",
    note: "Respiração curta em estresse",
  },
  {
    key: "quadril-e",
    label: "Quadril E",
    top: "58%",
    left: "42%",
    intensity: "moderada",
    note: "Apoio maior no lado esquerdo",
  },
  {
    key: "quadril-d",
    label: "Quadril D",
    top: "58%",
    left: "58%",
    intensity: "leve",
    note: "Compensação leve",
  },
];

export const backPoints: BodyPoint[] = [
  {
    key: "cervical",
    label: "Cervical",
    top: "15%",
    left: "50%",
    intensity: "moderada",
    note: "Base de pescoço tensa",
  },
  {
    key: "ombro-e",
    label: "Trapézio/Ombro E",
    top: "24%",
    left: "35%",
    intensity: "alta",
    note: "Ponto gatilho recorrente",
  },
  {
    key: "ombro-d",
    label: "Trapézio/Ombro D",
    top: "24%",
    left: "65%",
    intensity: "moderada",
    note: "Melhora parcial entre sessões",
  },
  {
    key: "dorsal",
    label: "Dorsal",
    top: "36%",
    left: "50%",
    intensity: "moderada",
    note: "Fáscia mais rígida",
  },
  {
    key: "lombar",
    label: "Lombar",
    top: "49%",
    left: "50%",
    intensity: "alta",
    note: "Principal queixa das últimas sessões",
  },
  {
    key: "quadril-e",
    label: "Glúteo/Quadril E",
    top: "61%",
    left: "43%",
    intensity: "moderada",
    note: "Irradiação leve",
  },
  {
    key: "quadril-d",
    label: "Glúteo/Quadril D",
    top: "61%",
    left: "57%",
    intensity: "leve",
    note: "Estável",
  },
];

export const timeline = [
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

export function getIntensityLabel(intensity: BodyPoint["intensity"]) {
  switch (intensity) {
    case "alta":
      return "Alta";
    case "moderada":
      return "Moderada";
    default:
      return "Leve";
  }
}

export function getPointScale(intensity: BodyPoint["intensity"]) {
  switch (intensity) {
    case "alta":
      return "h-7 w-7";
    case "moderada":
      return "h-6 w-6";
    default:
      return "h-5 w-5";
  }
}
