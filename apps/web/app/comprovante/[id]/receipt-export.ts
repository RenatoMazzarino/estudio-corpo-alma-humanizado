import { toBlob, toCanvas } from "html-to-image";

const isIOSDevice = (userAgent: string) => /iPad|iPhone|iPod/i.test(userAgent);

export const renderReceiptImageBlob = async (node: HTMLElement) => {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const rect = node.getBoundingClientRect();
  const measuredWidth = node.scrollWidth > 0 ? node.scrollWidth : Math.round(rect.width);
  const measuredHeight = node.scrollHeight > 0 ? node.scrollHeight : Math.round(rect.height);
  const targetWidth = Math.max(380, measuredWidth);
  const targetHeight = Math.max(560, measuredHeight);
  const pixelRatio = 2;
  const options = {
    cacheBust: true,
    pixelRatio,
    width: targetWidth,
    height: targetHeight,
    canvasWidth: targetWidth * pixelRatio,
    canvasHeight: targetHeight * pixelRatio,
  };

  const blob = await toBlob(node, options);
  if (blob) return blob;

  const canvas = await toCanvas(node, options);
  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((value) => resolve(value), "image/png")
  );
};

export const downloadReceiptBlob = (blob: Blob, filename: string, userAgent: string) => {
  const objectUrl = URL.createObjectURL(blob);
  if (isIOSDevice(userAgent)) {
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
    return;
  }

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
};
