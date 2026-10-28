# Shelf Pulse: design notes

Concept prototype for the L'Oréal Sustainability Challenge 2026 (Sales Track). Not an official L'Oréal product.

## Who we design for

| Person | Reality | What they need from us |
|---|---|---|
| **Sales rep** | 30–40 outlets a day, a few minutes each. One hand on the phone, often in sunlight, patchy network. More comfortable in Hindi or a regional language. Paid on sales. | A check that takes about a minute, tells them what to do, and never looks like extra admin or a pay cut. |
| **Retailer** | Wants to sell, not to be stuck with stock. Trusts the rep. Distrusts "returns hassle". | A reason to say yes: faster-selling swaps, simple offers in their language, no paperwork. |
| **Area manager** | Many flags, little time. Has to prove waste fell *without* stock-outs. | One queue to decide quickly, with the reason attached, and numbers that show waste down and availability held. |

## How might we…

1. …help a rep see which stock won't sell before it expires, **in about 60 seconds per shop**, without it feeling like admin?
2. …make **flagging early pay off** for the rep and the retailer, so it never feels like a pay cut or a "returns hassle"?
3. …give the area manager enough evidence to **approve a route in seconds**, and to prove waste fell without stock-outs?

## Design principles

1. **One minute, one hand.** A red-list check takes about 60 seconds. Any action is 3 taps or fewer. Touch targets are at least 48 px, controls sit in thumb reach, and an outdoor mode gives maximum contrast in sunlight.
2. **Tell, then explain.** Every item leads with its status (icon + colour + word), then the act-by date, then a one-line "why" in plain words. Colour is never the only signal.
3. **The suggestion comes from the app; the person decides.** AI and the playbooks propose and show their reason or confidence. Nothing is sent, ordered or approved automatically. Everything works with AI switched off.
4. **Celebrate saves, not flags.** We count ₹ kept from waste and batches resolved before act-by, never the number of flags raised. We use no blame language: "let's move it to a faster shop", never "you overstocked".
5. **Works where the rep works.** Offline first, in the rep's language, with Indian number formats (₹, lakh, crore). It stays fast on a low-cost Android phone.

## Non-negotiables

- [ ] Red-list check in about **60 seconds** per outlet
- [ ] Any action within **3 taps**
- [ ] Works **offline**; syncs when the network returns
- [ ] Status shown as **icon + colour + words**, never colour alone
- [ ] **No blame language** anywhere (UI, AI drafts, manager summaries)

## Visual language

L'Oréal-inspired, using open-licence stand-ins until official assets are supplied:

- **Black and white first.** A black header band on every screen, white (or near-black in dark mode) content, generous white space.
- **Typography: Montserrat.** 700 for headings and key numbers; 400–600 for UI text. Page titles are **bold uppercase**, calls to action are **bold uppercase with wide letter-spacing** (as on L'Oréal's own pages). Uppercase only affects Latin script; Hindi, Marathi, Tamil and Bengali fall back to Noto Sans in each script.
- **One accent: rose** (`#c2185b` light, `#f48fb1` dark, `#8e0e43` outdoor), used sparingly: the active tab, the "Suggested" label and edge, focus rings. Suggestion boxes stay neutral with a rose edge, so the accent never reads as the red status.
- **A decorative gradient mark** (peach → coral → rose) beside the product name. It carries no meaning.
- **Status colours are reserved** for green / amber / red, each with its icon and word.
- **Charts** use a validated pair (deep gold for the pilot, blue for control), checked for colour-blind and normal-vision separation and contrast.
- All of this lives in `src/design/tokens.css`. Official colours, fonts and the wordmark drop in there and in `public/brand/` (see `public/brand/README.md`). The L'Oréal logo is never redrawn or bundled from unofficial sources.
- Themes: Light (default), Dark, **Outdoor** (pure black on white, thicker borders, 18 px base text), Auto (follows the phone).
- Digits stay Latin in every language (matching invoices and packs); the words *lakh* and *crore* are translated.

## Words we use, and avoid

| Use | Avoid |
|---|---|
| "Let's move it to a shop where it sells" | "Overstocked", "dead stock", "your mistake" |
| "Act by 15 Dec" | Raw ratios on the rep's screen |
| "₹ saved from waste" | "Flags raised" as a score |
| "Please recount" (when numbers don't add up) | "Wrong count", "error" |
