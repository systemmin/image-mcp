import fs from "fs/promises";
import path from "path";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

export interface LoadedImage {
  base64: string;
  mimeType: string;
  name: string;
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? "image/jpeg";
}

export async function loadImage(filePath: string): Promise<LoadedImage> {
  const abs = path.resolve(filePath);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(abs);
  } catch (err) {
    throw new Error(`无法读取图片文件: ${abs} - ${(err as Error).message}`);
  }
  return {
    base64: buffer.toString("base64"),
    mimeType: getMimeType(abs),
    name: path.basename(abs),
  };
}

export async function loadImages(filePaths: string[]): Promise<LoadedImage[]> {
  if (filePaths.length === 0) {
    throw new Error("图片路径列表不能为空");
  }
  return Promise.all(filePaths.map(loadImage));
}
