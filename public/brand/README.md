# Brand assets: drop official files here

Nothing in this folder comes from an unofficial source. Take these files **only from the official L'Oréal brand kit**, keeping the exact file names:

| File | Used for | Format |
|---|---|---|
| `logo-wordmark.svg` | Wordmark on light surfaces | SVG, transparent background |
| `logo-wordmark-inverse.svg` | Wordmark on the black header band (used by default) | SVG, white |
| `favicon.svg` | Browser tab icon | SVG, square |
| `icon-192.png` | Installed-app icon (PWA) | PNG 192×192 |
| `icon-512.png` | Installed-app icon and splash (PWA) | PNG 512×512 |
| `fonts/` (optional) | Official heading and UI fonts | WOFF2 + licence |

After adding them:

1. Set `hasWordmark: true` in `src/config/brand.ts`.
2. Fonts: the app uses **Montserrat** (open licence, installed from npm) as a stand-in. To use the official typeface, add its WOFF2 files under `fonts/`, declare them with `@font-face` in `src/design/tokens.css`, and put the name first in `--font-heading` and `--font-body`.
3. Put official colour values into `src/design/tokens.css`. Every screen reads from there.

The `favicon.svg` here now is a neutral placeholder (a dot), not a L'Oréal mark. The app's installed-app icon also uses it until `icon-192.png` and `icon-512.png` are added (then list them in the `manifest.icons` array in `vite.config.ts`).
