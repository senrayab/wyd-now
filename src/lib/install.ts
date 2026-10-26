"use client";

/*
 * PWA 설치 프롬프트. beforeinstallprompt 는 페이지 로드 직후 한 번 오므로
 * 앱 시작 시(AppShell) listenForInstallPrompt() 로 미리 받아 둡니다.
 */
import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function listenForInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    emit();
  });
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

export type InstallState = "installed" | "available" | "unavailable";

function getState(): InstallState {
  if (installed || isStandalone()) return "installed";
  return deferred ? "available" : "unavailable";
}

export function useInstallState() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getState,
    () => "unavailable" as InstallState,
  );
}

export async function promptInstall() {
  if (!deferred) return "unavailable" as const;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  emit();
  return outcome;
}
