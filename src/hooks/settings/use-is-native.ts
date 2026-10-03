import { getBackend } from "@/lib/backend/get-backend";

/** False in the browser preview, where there is no real vault folder or OS dialog. */
export function useIsNative(): boolean {
  return getBackend().native;
}
