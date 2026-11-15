---
target_identity: "file:/Users/pedrobalderrama/github/nasa_challenge/web/src/app/Shell.tsx"
target_fingerprint: "sha256:e1c598e357dde8e6ddb9fcaa5ef8b6464cf0887812f510a240b723c51eb65c9e"
target_path: /Users/pedrobalderrama/github/nasa_challenge/web/src/app/Shell.tsx
timestamp: 2026-11-15T18-35-25Z
slug: web-src-app-shell-tsx
---
| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 3 | Dialogs labelled with aria-label instead of visible heading; duplicate h1/h2 app name |
| 2 | Performance | 3 | Sheet animates height; 11 MB textures |
| 3 | Theming | 2 | 214 uses of deprecated aliases; Inter never loaded; font-weight 600 off-scale |
| 4 | Responsive | 2 | Compare panel overflows 643/390; 7–10px overflow in chart legend |
| 5 | Implementation integrity | 2 | 6 side-tab stripes, nested cards, three number formatters (comma vs point) |
| **Total** | | **12/20** | Acceptable |

P0: 0 · P1: 3 (compare overflow, Inter missing, comma vs point) · P2: 10 · P3: 5.
Recommended: adapt → typeset → clarify → distill/layout → extract → harden → polish.
