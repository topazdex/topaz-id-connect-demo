import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` during SSR and the first client render, then `true` after hydration —
 * the standard gate for wallet UI whose connected/disconnected markup must match
 * on both sides before wagmi rehydrates. Uses `useSyncExternalStore` so it never
 * calls `setState` inside an effect.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
