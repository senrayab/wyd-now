/*
 * 이미지 처리 서비스
 * 업로드 → WebP 변환(내부 저장) / 다운로드·공유 → PNG 변환
 * 화면과 저장소에 의존하지 않는 순수 함수만 둡니다.
 */

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
/** 디코딩 가능한 최대 픽셀 수 (메모리 보호) */
export const MAX_SOURCE_PIXELS = 50_000_000;
/** 저장 시 긴 변 최대 길이. 넘으면 비율을 유지한 채 축소 */
export const MAX_OUTPUT_SIDE = 2560;
export const WEBP_QUALITY = 0.86;

export const ACCEPT_ATTR = "image/png,image/jpeg,image/webp,image/gif";

export type ImageErrorCode =
  | "too-large"
  | "unsupported"
  | "corrupt"
  | "too-many-pixels"
  | "encode-failed";

const MESSAGES: Record<ImageErrorCode, string> = {
  "too-large": "20MB 이하의 이미지만 올릴 수 있어요.",
  unsupported: "PNG, JPG, WebP, GIF 이미지만 올릴 수 있어요.",
  corrupt: "이미지를 읽을 수 없어요. 손상된 파일인지 확인해 주세요.",
  "too-many-pixels": "이미지 해상도가 너무 커요. (최대 5천만 화소)",
  "encode-failed": "이 브라우저에서는 이미지 변환을 지원하지 않아요.",
};

export class ImageError extends Error {
  constructor(public code: ImageErrorCode) {
    super(MESSAGES[code]);
    this.name = "ImageError";
  }
}

export type SourceFormat = "png" | "jpeg" | "webp" | "gif";

/** 확장자·MIME 이 아닌 실제 파일 내용(시그니처)으로 형식을 판별 */
export async function sniffFormat(blob: Blob): Promise<SourceFormat | null> {
  const b = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0x89 && ascii(1, 4) === "PNG") return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(0, 4) === "GIF8") return "gif";
  return null;
}

export function toBaseName(fileName: string) {
  const base = fileName.replace(/\.[^./\\]+$/, "").replace(/[\\/:*?"<>|]+/g, "_").trim();
  return base || "image";
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function createCanvas(width: number, height: number): { canvas: AnyCanvas; ctx: AnyContext } {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = "convertToBlob" in canvas ? canvas.getContext("2d", { alpha: true }) : null;
    if (ctx) return { canvas, ctx };
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new ImageError("encode-failed");
  return { canvas, ctx };
}

function encode(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob | null> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type, quality }).catch(() => null);
  }
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function decode(blob: Blob) {
  try {
    // EXIF 방향을 반영해 실제 보이는 방향으로 디코딩
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError("corrupt");
  }
}

function draw(bitmap: ImageBitmap, width: number, height: number) {
  const { canvas, ctx } = createCanvas(width, height);
  ctx.clearRect(0, 0, width, height); // 투명 배경 유지
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

export interface WebPResult {
  blob: Blob;
  mimeType: "image/webp";
  baseName: string;
  width: number;
  height: number;
}

export async function convertToWebP(file: File): Promise<WebPResult> {
  if (file.size > MAX_FILE_BYTES) throw new ImageError("too-large");
  if (!(await sniffFormat(file))) throw new ImageError("unsupported");

  const bitmap = await decode(file);
  try {
    if (bitmap.width * bitmap.height > MAX_SOURCE_PIXELS) throw new ImageError("too-many-pixels");
    const scale = Math.min(1, MAX_OUTPUT_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const blob = await encode(draw(bitmap, width, height), "image/webp", WEBP_QUALITY);
    // WebP 인코딩을 지원하지 않는 브라우저는 PNG 로 대신 돌려줍니다 → WebP 로 저장하지 않음
    if (!blob || blob.type !== "image/webp" || (await sniffFormat(blob)) !== "webp") {
      throw new ImageError("encode-failed");
    }
    return { blob, mimeType: "image/webp", baseName: toBaseName(file.name), width, height };
  } finally {
    bitmap.close();
  }
}

export async function convertToPNG(blob: Blob): Promise<Blob> {
  const bitmap = await decode(blob);
  try {
    const png = await encode(draw(bitmap, bitmap.width, bitmap.height), "image/png");
    if (!png || (await sniffFormat(png)) !== "png") throw new ImageError("encode-failed");
    return png.type === "image/png" ? png : new Blob([png], { type: "image/png" });
  } finally {
    bitmap.close();
  }
}

interface ImageSource {
  blob: Blob;
  baseName: string;
}

export function pngFileName(baseName: string) {
  return `${toBaseName(baseName)}.png`;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadPNG(image: ImageSource) {
  const png = await convertToPNG(image.blob);
  downloadBlob(png, pngFileName(image.baseName));
}

export async function preparePNGForShare(image: ImageSource): Promise<File> {
  const png = await convertToPNG(image.blob);
  return new File([png], pngFileName(image.baseName), { type: "image/png" });
}

export type ShareResult = "shared" | "cancelled" | "downloaded";

/** Web Share API 로 PNG 공유. 파일 공유를 못 하면 PNG 다운로드로 대체 */
export async function sharePNG(image: ImageSource, title?: string): Promise<ShareResult> {
  const file = await preparePNGForShare(image);
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  downloadBlob(file, file.name);
  return "downloaded";
}
