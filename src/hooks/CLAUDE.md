# src/hooks/

All SSR-safe. Import by path — `import { useMediaQuery } from '@/hooks/useMediaQuery'` — no barrel (it would ship
`react-hook-form` with every hook, see `src/components/CLAUDE.md` → Gotchas).

```
useZodForm/            useForm + zodResolver — the client half of "one schema on both sides"
useBotSignals.ts       honeypot ref + fill time for a form (server half: isLikelyBot, @/lib/botGuard)
useLocalStorage/       useSyncExternalStore: same-tab + cross-tab sync, optional `parse` (Zod)
useMediaQuery.ts       boolean for a media query (false on the server)
useDebounce.ts         useDebounce(value) · useDebouncedCallback(fn)
useThrottle.ts         throttled callback (leading + trailing)
useCopyToClipboard.ts  copy(text) + self-resetting `copied`
useEventListener.ts    window / 'document' / element listener, latest handler without re-attaching
useIntersectionObserver.ts  { ref, entry, isIntersecting } — callback ref, freezeOnceVisible
```

Not here on purpose: click-outside, scroll lock, focus trap — Radix (`Dialog`, `Popover`, …) does them and a second
implementation fights it over `document.body`. `useLayoutEffect` needs no isomorphic wrapper in React 19.

- **Fresh closure, stable identity**: inside effects → `useEffectEvent` (React 19.2+, see `useEventListener`).
  A function handed to event handlers (debounce/throttle) → a ref assigned in `useLayoutEffect`.
- **No `useCallback`/`useMemo`** — React Compiler memoizes closures; module-level constants for truly static ones.
- **Elements via callback ref, not `RefObject`**: `useState<T | null>` + `ref={setNode}` re-runs the effect when the
  node mounts later (`useIntersectionObserver` returns its `ref`; `useEventListener` takes the node).
- `useLocalStorage`: `initialValue` renders on the server AND during hydration — gate on a mounted flag if the
  one-frame flash matters. Blocked storage / corrupt JSON / a failed `parse` (`{ parse: schema.parse }`) →
  `initialValue`; a failed write keeps what storage really holds.
- Timing logic lives in `src/utils/{debounce,throttle}`; hooks only wrap it.
- New hook: folder convention when it has a test (`useLocalStorage/`); test file starts with
  `// @vitest-environment jsdom`.

## Gotchas

- **A listener/observer hook does nothing for an element rendered conditionally.** The effect was keyed on the ref
  OBJECT, which never changes → callback ref in state (`ref={setNode}`).
- **react-hook-form / TanStack Table misbehave under the React Compiler.** Add `'use no memo'` to that component
  and note it here — never sprinkle manual `useMemo`.
