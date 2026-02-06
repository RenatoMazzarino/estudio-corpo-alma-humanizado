"use client";

import { useEffect, useState } from "react";

type DebugBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  meta: string;
};

function buildLabel(el: HTMLElement) {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : "";
  const classes = el.className
    ? `.${String(el.className)
        .split(" ")
        .filter(Boolean)
        .slice(0, 3)
        .join(".")}`
    : "";
  return `${tag}${id}${classes}`;
}

function buildMeta(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  return `pos:${style.position} z:${style.zIndex} pe:${style.pointerEvents} ov:${style.overflow}`;
}

export function DebugPointerOverlay() {
  const [box, setBox] = useState<DebugBox | null>(null);

  useEffect(() => {
    const handlePoint = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setBox({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        label: buildLabel(el),
        meta: buildMeta(el),
      });
    };

    const onPointer = (event: PointerEvent) => handlePoint(event.clientX, event.clientY);
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) handlePoint(touch.clientX, touch.clientY);
    };

    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("touchstart", onTouch);
    };
  }, []);

  if (!box) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-9999">
      <div
        className="absolute border-2 border-red-500 bg-red-500/10"
        style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
      />
      <div
        className="absolute bg-black/80 text-white text-[10px] px-2 py-1 rounded"
        style={{ left: box.x, top: Math.max(0, box.y - 24) }}
      >
        <div className="font-semibold">{box.label}</div>
        <div className="opacity-80">{box.meta}</div>
      </div>
    </div>
  );
}
