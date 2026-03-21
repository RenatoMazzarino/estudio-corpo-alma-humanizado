import type { CSSProperties } from "react";
import { PRIMARY_STUDIO_BRANDING } from "./defaults";
import type { TenantRuntimeConfig } from "./runtime";

type TenantThemeCssVars = CSSProperties & Record<`--${string}`, string>;

function normalizeCssValue(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function parseHexColor(value: string | null | undefined) {
  const normalized = normalizeCssValue(value);
  if (!normalized) return null;
  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1] ?? "";
  if (hex.length !== 6) return null;
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue)
    ? null
    : { red, green, blue, hex: `#${hex}` };
}

function toLineColor(value: string, opacity: number, fallback: string) {
  const parsed = parseHexColor(value);
  if (!parsed) return fallback;
  const safeOpacity = Math.min(1, Math.max(0, opacity));
  return `rgba(${parsed.red}, ${parsed.green}, ${parsed.blue}, ${safeOpacity})`;
}

function darkenColor(value: string, factor: number, fallback: string) {
  const parsed = parseHexColor(value);
  if (!parsed) return fallback;
  const safeFactor = Math.min(1, Math.max(0, factor));
  const channel = (input: number) => Math.max(0, Math.round(input * (1 - safeFactor)));
  const red = channel(parsed.red).toString(16).padStart(2, "0");
  const green = channel(parsed.green).toString(16).padStart(2, "0");
  const blue = channel(parsed.blue).toString(16).padStart(2, "0");
  return `#${red}${green}${blue}`;
}

function resolveFontFamily(
  strategy: string | null | undefined,
  customValue: string | null | undefined,
  fallback: string
) {
  const normalizedStrategy = (strategy ?? "").trim().toLowerCase();
  const custom = normalizeCssValue(customValue);
  if (!custom || normalizedStrategy === "platform_default") return fallback;

  const normalizedCustom = custom.toLowerCase();
  if (normalizedCustom === "inter") return `var(--font-inter), ${fallback}`;
  if (normalizedCustom === "cormorant garamond") return `var(--font-cormorant), ${fallback}`;
  if (normalizedCustom === "lato") return `var(--font-inter), ${fallback}`;
  if (normalizedCustom === "playfair display") return `var(--font-cormorant), ${fallback}`;

  return `${custom}, ${fallback}`;
}

export function buildTenantThemeCssVars(runtimeConfig: TenantRuntimeConfig | null | undefined): TenantThemeCssVars {
  const branding = runtimeConfig?.branding;
  const primary = normalizeCssValue(branding?.primaryColor) ?? PRIMARY_STUDIO_BRANDING.primaryColor;
  const secondary = normalizeCssValue(branding?.secondaryColor) ?? PRIMARY_STUDIO_BRANDING.secondaryColor;
  const accent = normalizeCssValue(branding?.accentColor) ?? PRIMARY_STUDIO_BRANDING.accentColor;
  const background = normalizeCssValue(branding?.backgroundColor) ?? PRIMARY_STUDIO_BRANDING.backgroundColor;
  const surface = normalizeCssValue(branding?.surfaceColor) ?? PRIMARY_STUDIO_BRANDING.surfaceColor;
  const text = normalizeCssValue(branding?.onSurfaceColor) ?? PRIMARY_STUDIO_BRANDING.onSurfaceColor;
  const domStrong = darkenColor(secondary, 0.25, "#8F7483");
  const textMuted = toLineColor(text, 0.56, "#868E96");
  const line = toLineColor(text, 0.06, "rgba(44, 51, 51, 0.06)");
  const sansFont = resolveFontFamily(
    branding?.fontStrategy,
    branding?.bodyFontFamily,
    "var(--font-inter), ui-sans-serif, system-ui, sans-serif"
  );
  const serifFont = resolveFontFamily(
    branding?.fontStrategy,
    branding?.headingFontFamily,
    "var(--font-cormorant), ui-serif, Georgia, serif"
  );

  return {
    "--color-studio-bg": background,
    "--color-studio-green": primary,
    "--color-studio-green-dark": darkenColor(primary, 0.2, "#495744"),
    "--color-studio-light": surface,
    "--color-studio-accent": accent,
    "--color-studio-pink": secondary,
    "--color-dom": secondary,
    "--color-dom-strong": domStrong,
    "--color-studio-text": text,
    "--color-text-muted": textMuted,
    "--color-main": text,
    "--color-muted": textMuted,
    "--color-line": line,
    "--font-sans": sansFont,
    "--font-serif": serifFont,
    "--font-lato": sansFont,
    "--font-playfair": serifFont,
  } as TenantThemeCssVars;
}
