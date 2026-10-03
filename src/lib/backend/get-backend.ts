import type { Backend } from "@/lib/backend/backend";
import { createMockBackend } from "@/lib/backend/mock-backend";
import { tauriBackend } from "@/lib/backend/tauri-backend";

let backend: Backend | undefined;

/** Rust when running inside the Tauri window, the in-memory mock in a browser. */
export function getBackend(): Backend {
  backend ??= "__TAURI_INTERNALS__" in window ? tauriBackend : createMockBackend();
  return backend;
}
