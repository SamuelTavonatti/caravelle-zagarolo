# DESIGN.md — Caravelle Roadtrip (Trento → Zagarolo)

## Visual World & Aesthetic Direction
An editorial Italian golden-hour automotive experience transitioning cleanly into a precision dark-mode cabin cockpit and an Apple Maps-inspired 3D sunlit navigation cinema.

- **Act I (Daylight Italian Golden Hour):** Warm late-afternoon Trentino sunlight, atmospheric depth-of-field foothills, crisp dark asphalt shoulder, pearl-white 2008 Volkswagen Caravelle (T5) facing right, translucent warm-tinted Apple Liquid Glass chrome.
- **Act II (Obsidian Cabin Cockpit):** Precision dark obsidian interior surface (`#090B0E`), tonal elevated wells (`#11151B` and `#181E27`), alabaster ink (`#F5F6F8`), titanium secondary ink (`#9AA3B2`), and vibrant Emerald (`#10B981`) as the unmistakable active/booking focal accent.
- **Act III (Black Curtain & Apple Maps 3D Cinema):** Deep cinema black (`#050507`) curtain leading into sunlit high-contrast Apple Maps-inspired 3D vector cartography with luminous emerald-to-cyan route ribbon, crisp glass telemetry HUD, and monumental editorial end card.

## Color Tokens
- **Canvas Obsidian:** `#090B0E`
- **Cinema Black Curtain:** `#050507`
- **Surface Container:** `#11151B`
- **Surface Elevated:** `#181E27`
- **Hairline Border:** `rgba(255, 255, 255, 0.09)`
- **Specular Highlight:** `inset 0 1px 0 0 rgba(255, 255, 255, 0.14)`
- **Ink Primary:** `#F5F6F8`
- **Ink Secondary:** `#A4AEBC` (WCAG AA ≥ 6.5:1 on `#090B0E`)
- **Ink Muted:** `#7D8796` (WCAG AA ≥ 4.8:1 on `#090B0E`)
- **Accent Emerald (Selection & Primary Action):** `#10B981` (Hover: `#059669`, Ink on Emerald: `#042419` ≥ 7.2:1)
- **Accent Warm Gold (Golden-Hour Highlight / Highway Telemetry):** `#E5B769`
- **Semantic Alert / Release:** `#EF4444`

### Chromatic Ban List
- Zero purple, indigo, or violet gradients or ambient glows.
- Zero neon cyan/magenta SaaS halos.
- Zero emoji icons; use Lucide vector icons with consistent stroke weight.

## Typography
- **Display & UI Sans:** `'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- **Telemetry / Seat Codes:** `'JetBrains Mono', ui-monospace, monospace` (strictly for seat codes `F1–R3`, coordinates, km/h, and distances, with `tabular-nums`)
- **Tracking:** Negative tracking (`-0.025em`) on large display titles; natural `0` on body; `+0.06em` on micro telemetry badges.
- **Mobile Input Floor:** Strictly `>= 16px` (`text-base`) on all `<input>`, `<select>`, and `<textarea>` elements.

## Motion Language (`apple-design` + `motion-and-showreel`)
- **Sliding Door Physics:** Critically damped spring (`response: 0.45s`, `dampingRatio: 1.0` → Motion `{ type: 'spring', duration: 0.45, bounce: 0 }`).
- **UI Sheets & Modals:** Strong ease-out `[0.23, 1, 0.32, 1]`, `300ms` enter / `220ms` exit.
- **Tactile Feedback:** Instant `:active { transform: scale(0.97); }`, `prefers-reduced-motion: reduce` fallback to crisp opacity transitions.
