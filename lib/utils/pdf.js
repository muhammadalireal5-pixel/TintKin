/**
 * Minimal single-page PDF writer that embeds one JPEG (DCTDecode passthrough,
 * so no re-encoding and no PDF library dependency). The page is A4 width and
 * as tall as the image's aspect ratio requires, so nothing gets cut off.
 *
 * @param {Uint8Array} jpegBytes - baseline/progressive JPEG data
 * @param {number} pixelWidth - JPEG width in pixels
 * @param {number} pixelHeight - JPEG height in pixels
 * @returns {Uint8Array} PDF file bytes
 */
export function jpegToPdf(jpegBytes, pixelWidth, pixelHeight) {
  if (!(jpegBytes instanceof Uint8Array) || jpegBytes.length === 0) {
    throw new TypeError("jpegBytes must be a non-empty Uint8Array");
  }
  if (!(pixelWidth > 0) || !(pixelHeight > 0)) {
    throw new RangeError("pixel dimensions must be positive");
  }

  const A4_WIDTH_PT = 595.28;
  const pageW = A4_WIDTH_PT;
  const pageH = Math.round((A4_WIDTH_PT * pixelHeight) / pixelWidth * 100) / 100;
  const w = Math.round(pixelWidth);
  const h = Math.round(pixelHeight);

  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;

  const push = (part) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };
  const startObject = (id) => {
    offsets[id] = length;
    push(`${id} 0 obj\n`);
  };

  const content = `q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im0 Do\nQ\n`;

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  startObject(1);
  push("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject(2);
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  startObject(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      "/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n"
  );

  startObject(4);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB ` +
      `/BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  push(jpegBytes);
  push("\nendstream\nendobj\n");

  startObject(5);
  push(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);

  const xrefOffset = length;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let id = 1; id <= 5; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const chunk of chunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  return out;
}

/** Decodes a base64 `data:` URL into bytes (browser and Node). */
export function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl).split(",")[1] || "";
  if (typeof atob === "function") {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}
