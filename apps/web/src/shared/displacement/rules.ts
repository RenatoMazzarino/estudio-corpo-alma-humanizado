export type DisplacementRule = "urban" | "road";

export interface DisplacementEstimate {
  distanceKm: number;
  fee: number;
  rule: DisplacementRule;
}

export const DISPLACEMENT_PRICING = {
  minimumFee: 15,
  urbanLimitKm: 6,
  urbanIncludedKm: 3,
  urbanExtraPerKm: 3.5,
  roadPerKm: 3,
} as const;

const roundCurrency = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Number((Math.round(value * 2) / 2).toFixed(2));
};

export function calculateDisplacementFee(distanceKm: number): DisplacementEstimate {
  const normalizedDistance = Number.isFinite(distanceKm) ? Math.max(distanceKm, 0) : 0;
  const roundedDistance = Number(normalizedDistance.toFixed(2));

  if (roundedDistance <= DISPLACEMENT_PRICING.urbanLimitKm) {
    const extraKm = Math.max(roundedDistance - DISPLACEMENT_PRICING.urbanIncludedKm, 0);
    const calculated = DISPLACEMENT_PRICING.minimumFee + extraKm * DISPLACEMENT_PRICING.urbanExtraPerKm;
    return {
      distanceKm: roundedDistance,
      fee: roundCurrency(Math.max(calculated, DISPLACEMENT_PRICING.minimumFee)),
      rule: "urban",
    };
  }

  const calculated = roundedDistance * DISPLACEMENT_PRICING.roadPerKm;
  return {
    distanceKm: roundedDistance,
    fee: roundCurrency(Math.max(calculated, DISPLACEMENT_PRICING.minimumFee)),
    rule: "road",
  };
}
