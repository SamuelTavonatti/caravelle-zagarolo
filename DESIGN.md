# DESIGN.md — Caravelle Roadtrip (Architectural Editorial System)

## Visual World & Aesthetic Direction
Razor-sharp, anti-AI-slop Italian editorial automotive experience:
- **Canvas Obsidian / Graphite:** `#09090B`
- **Cinema Black Curtain:** `#050507`
- **Surface Container:** `#111114`
- **Surface Elevated:** `#18181B`
- **Hairline Dividers:** `1px solid rgba(255, 255, 255, 0.12)`
- **Ink Primary:** `#F8FAFC`
- **Ink Secondary:** `#A1A1AA`
- **Ink Muted:** `#71717A`
- **Active Seat & Booking Confirmation Accent:** `#10B981` (strictly restrained)
- **Google Maps Navigation Route Blue:** `#4285F4` (Casing: `#1967D2`)

## Geometry & Restraint Rules
- **Sharp Architectural Corners:** `rounded-none` or `rounded-[4px]` maximum. Zero `rounded-full` floating pills, zero neon glows, zero warm yellow/beige gradient text.
- **Typography:** `'Plus Jakarta Sans'` with tight display tracking (`-0.035em`) and `'JetBrains Mono'` with `tabular-nums` for telemetry (`738 KM · 4 TAPPE · 6/8 DISPONIBILI`, seat codes, distances, ETA).
- **Act I Hero:** Real full-bleed right-side profile photograph (`public/caravelle-side.jpg`) with an independent cropped GPU sliding-door layer.
- **Act III Navigation:** Google Maps Navigation aesthetic over MapLibre GL JS with continuous OSRM road geometry and shortest-angle low-pass camera bearing smoothing.
