import type { Ref } from 'react';

type HoneypotProps = {
  ref?: Ref<HTMLInputElement>;
};

/**
 * Invisible bait field for form bots (`useBotSignals` reads it, `isLikelyBot`
 * judges it). Off-screen and `aria-hidden` — never `display: none`, which
 * smarter bots skip. `autoComplete="nope"`, not "off": Chrome autofills "off"
 * fields and real users would trip the trap (src/components/CLAUDE.md → Gotchas). html-validate
 * flags that token — allow it exactly in `check-runtime`'s ALLOWED_HTML_ISSUES.
 */
function Honeypot({ ref }: HoneypotProps) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <input
        ref={ref}
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="nope"
        defaultValue=""
      />
    </div>
  );
}

export { Honeypot };
