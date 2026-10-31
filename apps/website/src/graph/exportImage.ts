import { downloadBlob } from "../download.ts";
import type { PlanGraph } from "./planGraph.ts";

export type ImageFormat = "svg" | "png" | "jpg";

const MIME = { svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg" } as const;

/** Sharper than the on-screen size, without letting a very wide plan outgrow canvas limits. */
const SCALE = 2;
const MAX_SIDE = 16_000;

export const svgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo dibujar el gráfico."));
    image.src = url;
  });
}

async function rasterize(graph: PlanGraph, type: "image/png" | "image/jpeg"): Promise<Blob> {
  const scale = Math.min(SCALE, MAX_SIDE / Math.max(graph.width, graph.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(graph.width * scale);
  canvas.height = Math.round(graph.height * scale);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("No se pudo preparar la imagen.");

  // The SVG already paints a white background; this keeps JPG from turning transparent areas black.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(await loadImage(svgDataUrl(graph.svg)), 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen."))),
      type,
      0.92,
    ),
  );
}

/** Saves the graph as `<baseName>.<format>`; rejects with a user-facing message on failure. */
export async function exportGraph(graph: PlanGraph, baseName: string, format: ImageFormat) {
  const blob =
    format === "svg"
      ? new Blob([graph.svg], { type: MIME.svg })
      : await rasterize(graph, MIME[format]);
  downloadBlob(`${baseName}.${format}`, blob);
}
