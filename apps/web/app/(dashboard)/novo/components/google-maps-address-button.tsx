"use client";

import Image from "next/image";
import { buildGoogleMapsSearchHref } from "../appointment-form.helpers";

export function GoogleMapsAddressButton({ query }: { query: string | null | undefined }) {
  const href = buildGoogleMapsSearchHref(query);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="shrink-0 w-9 h-9 rounded-xl border border-dom/35 bg-white text-dom-strong hover:bg-dom/15 transition flex items-center justify-center"
      aria-label="Abrir endereço no Google Maps"
      title="Ver no Google Maps"
    >
      <Image
        src="/icons/google-maps-icon-official.svg"
        alt=""
        width={18}
        height={18}
        className="h-4.5 w-4.5"
      />
    </a>
  );
}
