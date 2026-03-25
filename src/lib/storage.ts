import fs from 'fs';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads');

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function saveFile(fileId: string, filename: string, buffer: Buffer): string {
  ensureUploadDir();
  const dir = path.join(UPLOAD_DIR, fileId);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function readFile(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}
