---
target: web app (whole)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/pedrobalderrama/github/nasa_challenge/web/src/app/Shell.tsx"
target_fingerprint: "sha256:e1c598e357dde8e6ddb9fcaa5ef8b6464cf0887812f510a240b723c51eb65c9e"
target_path: /Users/pedrobalderrama/github/nasa_challenge/web/src/app/Shell.tsx
timestamp: 2026-11-15T18-35-25Z
slug: web-src-app-shell-tsx
---
Method: dual-agent (A: design review · B: detector + evidence) — baseline before the 008-ui-polish pass

## Design Health Score (Nielsen)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Map paints Baja California as rising while the panel says not enough evidence |
| 2 | Match system / real world | 2 | p, α, n, Theil-Sen in the first view; decimal point in panel vs comma in legend/table |
| 3 | User control and freedom | 2 | ComparePanel overflows horizontally: close button and figure out of view |
| 4 | Consistency and standards | 1 | Two visual systems: closes, period controls, chart encodings, headings, formatters |
| 5 | Error prevention | 3 | Year selects only offer valid periods |
| 6 | Recognition rather than recall | 3 | Period, variable and state always visible |
| 7 | Flexibility and efficiency | 2 | Sortable table; no shortcuts |
| 8 | Aesthetic and minimalist design | 2 | Seven fact rows (method, provenance, units) before the plain-language sentence |
| 9 | Error recovery | 2 | Network error shows raw id MX-CHH and no cause |
| 10 | Help and documentation | 3 | Inline term definitions good; methods sheet is a wall |
| **Total** | | **23/40** | Acceptable |

## Design specificity
Core is product-specific (verdict icon+word, CI band, partial year, period caveat). Wrapper is interchangeable: same raised box with 1px border and a 3–4px side stripe everywhere. Detector: 6 × side-tab (analysis.css, compare.css, guide.css), nested-cards, line-length (symptom of the compare overflow). repeating-stripes is a false positive (no-data hatch).

## Priority issues
- [P1] ComparePanel overflows horizontally (643px content in 390/419px panel).
- [P1] «Not enough evidence» contradicts itself: bold slope right under it.
- [P1] Two unreconciled visual systems (period control, charts, closes, formatters).
- [P2] Panel order: facts before words; method/provenance repeated three times.
- [P2] Mobile: header 165px, WelcomeCard has no surface, methods double padding, table cuts «Class».

## Personas
Casey (mobile): half sheet shows only verdict + contradicting figure; cannot see compare close. Jordan (first time): app name twice, p/α before plain words, raw id on error. Sam (a11y): welcome button focus differs from the rest; A/B pins overlap.
