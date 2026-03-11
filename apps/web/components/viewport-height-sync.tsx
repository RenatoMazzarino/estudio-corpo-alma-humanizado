"use client";

import { useEffect } from "react";

function applyViewportHeightVariable() {
  if (typeof window === "undefined") return;
  const height = Math.max(320, Math.round(window.innerHeight));
  document.documentElement.style.setProperty("--app-dvh", `${height}px`);
}

export function ViewportHeightSync() {
  useEffect(() => {
    applyViewportHeightVariable();

    const handleResize = () => applyViewportHeightVariable();
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });
    window.visualViewport?.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  return null;
}

