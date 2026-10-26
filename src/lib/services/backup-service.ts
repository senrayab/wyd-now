import { downloadBlob } from "../image/image-service";
import { getDataStore } from "../storage";
import type { BackupFile } from "../storage/types";
import { toDateKey } from "../date";

export async function exportBackup() {
  const backup = await getDataStore().exportAll();
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
  downloadBlob(blob, `wyd-now-backup-${toDateKey(new Date())}.json`);
  return backup;
}

function isBackup(value: unknown): value is BackupFile {
  const v = value as BackupFile;
  return (
    !!v &&
    v.app === "wyd-now" &&
    v.version === 1 &&
    [v.artists, v.schedules, v.mySpaces, v.images].every(Array.isArray) &&
    v.images.every((i) => typeof i.dataUrl === "string" && i.dataUrl.startsWith("data:image/webp"))
  );
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("JSON 파일을 읽을 수 없어요.");
  }
  if (!isBackup(parsed)) throw new Error("wyd now 백업 파일이 아니에요.");
  return parsed;
}

export async function restoreBackup(backup: BackupFile) {
  await getDataStore().importAll(backup);
}

export interface StorageInfo {
  usage?: number;
  quota?: number;
  persisted?: boolean;
  supported: boolean;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (!navigator.storage?.estimate) return { supported: false };
  const { usage, quota } = await navigator.storage.estimate();
  const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : undefined;
  return { usage, quota, persisted, supported: true };
}

/** 브라우저가 저장 공간을 임의로 비우지 않도록 영구 저장을 요청 */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
