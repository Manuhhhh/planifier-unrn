/** Hands `blob` to the browser as a file download. */
export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Hands `text` to the browser as a file download. */
export function downloadText(fileName: string, text: string, type = "application/json"): void {
  downloadBlob(fileName, new Blob([text], { type }));
}
