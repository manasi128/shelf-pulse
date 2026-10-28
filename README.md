# Shelf Pulse

Concept prototype for the L'Oréal Sustainability Challenge 2026 (Sales Track). Not an official L'Oréal product. Example data.

Field sales reps in India's general trade can't see stock ageing on the shelf, so slow and near-expiry stock comes back as returns, expiry and destruction: up to ~2.5% of revenue. Shelf Pulse makes the rep the sensor. A mobile-first app helps the rep spot slow or ageing stock early, take the right action in the shop, and route anything at risk before it becomes a write-off, **without cutting orders or pushing discounts**. A companion web desk lets the area manager approve flags and prove that waste fell while must-sell availability held.

## Setup

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173  (development)
npm test           # 102 tests: logic, seed demo story, storage, sync, AI, locales
npm run build      # production build (with offline service worker)
npm run preview    # serve the production build at http://localhost:4173
```

Everything runs offline in demo mode. No accounts or API keys are needed.

## Before the demo (2 minutes)

1. Run `npm run build && npm run preview` and open **http://localhost:4173** in Chrome. The production build installs the offline service worker; the dev server does not.
2. Open two windows side by side:
   - **Rep:** http://localhost:4173/rep in a phone-sized window (DevTools device toolbar, about 390 px wide).
   - **Manager:** http://localhost:4173/manager in a normal window.

   Both read the same offline store on the same device, so a flag raised in one appears in the other within a second.
3. In the rep window, go to **Sync** and check:
   - **AI help** is set to **Demo**.
   - Tap **Reset demo data** if you have rehearsed.
4. Optional: set **Display → Outdoor** to show the sunlight mode.

## The 3-minute demo script

| Time | Beat | Do this | Say this |
|---|---|---|---|
| 0:00 | **1. Today** | Rep window, **Today**. | "Reps visit 30–40 shops a day. Today is ranked by risk, not route. Sharma General Store is stop 3 on the route but first here: one batch is already past its act-by date, three lines are slow, and two flags are open." |
| 0:25 | **2. Shelf photo** | Tap **Sharma** → **Start shelf check** → **Snap shelf photo**. | "One photo pre-fills the red-list count and reads batch codes. Each count shows how sure it is. The rep confirms or taps +/−. Everything works offline." |
| 0:45 | **3. Sunscreen turns red** | Point at the sunscreen card: 23 units, **Red**, act by 27 Nov, "0 sold". Optionally type **17**, watch it update, then type **23** back. | "The distributor billed 6 more since last week and none sold, so the act-by date moves inside 30 days and it turns red, instantly. Act-by is expiry minus the receiving shop's 60-day minimum, minus days to sell there, minus a week's transfer." |
| 1:05 | **3. Serum to a salon** | **Actions** tab. Show the serum card, then tap **Send to area manager** on the serum and on the sunscreen. | "Red stock gets a recovery ladder; first eligible wins. The professional serum has 40 days left, too short for a shop transfer, so it goes to a partner salon's back-bar. We always stop shipping that batch here, and we never discount it unlabelled." |
| 1:25 | **4. Lipstick on Thursday's run** | Scroll to the lipstick (amber) → **Propose this move**. | "Slow stock gets a different playbook: visibility, a 30-second brief, a bundle, then move. Two visits of trying unlocked the move. Fresh Look Cosmetics sells this shade every visit and has a delivery run Thursday 5 Nov. It's settled through the distributor, and the rep is paid only when it sells there." |
| 1:45 | **5. Order keeps value** | **Order** tab. | "The order adds zero slow stock, yet keeps 108% of the usual value: fast sellers topped up to two visits of demand, plus the kajal and micellar water the retailer asked for. Growth protected, waste not created." |
| 2:00 | **Share (optional)** | **Share with retailer**. | "A WhatsApp draft in the shop's language, Hindi here. The rep edits and sends it; nothing is sent automatically." |
| 2:10 | **6. Manager approves** | Manager window, **Flags**: point at the category-team note, then **Approve** the serum and the lipstick. Open **Impact**. | "The flags arrived with what the rep saw. Sunscreen is now red in three outlets, so it goes to the category team's demand review. I approve; Impact moves: ₹ saved from waste, units kept from destruction, packaging and reverse trips. We count outcomes, never flags raised. CO₂ appears only when real emission factors are provided." |
| 2:40 | **7. Hindi** | Rep window: settings icon (top right) → **Language → हिन्दी**. Show Today and Actions. | "Every screen, every rule, in the rep's language: Hindi, Marathi, Tamil or Bengali. AI only suggests; the rep decides." |

Expected numbers on fresh demo data:
- ₹ saved goes from ₹15,320 to ₹22,571, shown as "+₹7,251 since you opened the desk".
- Units kept from destruction go from 37 to 50.

These are all covered by `src/data/scenario.test.ts` and `src/data/manager.test.ts`.

## What's in the box

**Rep app (mobile):**
- **Today**: the beat ranked by risk, with the top reasons.
- **Outlet brief**: act-by nudges, the red list, products not reordered, open flags, launch seeding.
- **Count**: shelf photo, batch scan, big +/− steppers, signals.
- **Talk**: three questions and a voice note.
- **Actions**: the slow-stock playbook and the near-expiry recovery ladder.
- **Order** and **Share**: suggested order and the retailer card.
- **Godown**: weekly distributor check.
- **Sync**: queue status, simulate offline, AI mode, reset.

**Manager desk (web):**
- **Overview**: weekly summary, KPIs, trend chart.
- **Flags**: approve or decline, with the rep's evidence.
- **Territory**: every outlet at a glance.
- **Impact**: sustainability tally by recovery route.

**Core logic** (`src/logic`, unit-tested):
- Shop sales, forecast, cover, life and act-by.
- Status, signals and escalation.
- Slow-stock playbook, transfer rules and recovery ladder.
- Suggested order, beat ranking, tallies and KPIs.

Every threshold is in `src/config/thresholds.ts`, labelled *pilot proposal*.

## AI (optional)

Every AI feature sits behind an interface in `src/ai/` with an offline version. AI only ever suggests: the rep or manager confirms each value, and every suggestion shows where it came from and how sure it is. Choose the mode on the **Sync** screen:

| Mode | What it does |
|---|---|
| **Off** | Rules and manual entry only. No photo or voice reading. |
| **Demo** (default) | Offline example readings: the shelf photo and voice note use sample data from the seed. Next action and messages come from the playbook rules. |
| **Live** | Calls Claude (`claude-opus-5-5`) through a small server route. Falls back to the offline version on any failure. |

| Feature | Live | Offline |
|---|---|---|
| Shelf photo → counts and batch codes | Claude vision | Example counts from the seed |
| Voice note → signals and retailer asks | Browser speech-to-text, then Claude extraction | Sample note, keyword extraction (5 languages) |
| Next-best action + one-line why | Claude picks **only** from the eligible playbook steps; anything else is rejected | Playbook rules |
| Retailer WhatsApp draft | Claude, in the shop's language; the rep edits and copies | Translated template |
| Manager weekly summary | Claude | Translated template |

To turn on live mode:

1. Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`.
2. Restart `npm run dev` (or `npm run preview`).
3. On the Sync screen, choose **Live**. It says "Live AI is connected" when the key is found.

How the key and requests are handled:
- **Key stays on the server.** `server/ai.ts` reads it on the dev/preview server only. It has no `VITE_` prefix, so it's never bundled into browser code, and the browser only ever calls `/api/ai/*`.
- **Requests** use structured JSON output, and opt into server-side fallback to another model if a request is declined.
- **Voice in live mode** uses the browser's own speech recognition (Chrome/Edge). In other browsers, type or paste the note.

## Offline

- **App shell:** the production build is an installable PWA. The service worker precaches every screen and the fonts (about 1.6 MB, once).
- **Data:** stored in IndexedDB (Dexie).
- **Sync queue:** every change is saved locally and queued in an outbox in the same step, then sent when the network returns. In demo mode the "server" just acknowledges.
- **Testing offline:**
  - Use **Sync → Simulate no network**.
  - Or stop `npm run preview` after one visit and reload: the app keeps working.

## Checked before hand-off

| Acceptance criterion | How it was checked |
|---|---|
| Changing a stock count updates sales, cover, act-by and status instantly | Unit tests; in the browser, typing 17 / 23 for the sunscreen |
| Amber and red show different playbooks | Actions screen: ladder for red, playbook for amber |
| Flags appear on the manager desk; approvals update the tallies | Two browser tabs; `manager.test.ts` |
| The language switch changes every visible string | Locale key-parity test; automated sweep of all 14 screens in Hindi, Marathi, Tamil and Bengali (only product, outlet and brand names, which are data, stay in English) |
| Everything works offline in mock mode | Production preview with the server stopped: count, photo, actions and manager desk all worked |
| Lighthouse accessibility ≥ 90 | **100 on all 14 screens** (Lighthouse 12, mobile, light theme) |
| No horizontal scroll at 360 px | Checked on all 14 screens in English, Hindi, Marathi, Tamil and Bengali |

## Brand

The look is L'Oréal-inspired, with open-licence stand-ins:
- Black header band, Montserrat 700 bold uppercase titles, tracked uppercase calls to action, one rose accent.
- All of it in `src/design/tokens.css`.

**No L'Oréal logo or font is bundled from unofficial sources.** `public/brand/README.md` lists exactly which official files to drop in: the wordmark SVGs, the favicon, the 192/512 PNG app icons and optional fonts. Then set `hasWordmark: true` in `src/config/brand.ts`.

## Where things are

| Path | What |
|---|---|
| `DESIGN.md` | Users, "How might we", principles, non-negotiables, visual language |
| `TRANSLATIONS.md` | Native-review checklist (all non-English text is machine-drafted) |
| `src/logic/` | All business rules, pure and unit-tested |
| `src/config/thresholds.ts` | Every threshold (pilot proposal); `demo.ts` fixes "today" at Mon 2 Nov 2026 |
| `src/data/` | Seed data, offline store, sync queue, derive layer for both apps |
| `src/ai/` | AI interfaces, offline versions, live client; `server/ai.ts` is the server route |
| `src/features/rep/`, `src/features/manager/` | Screens |
| `src/i18n/locales/` | All UI strings (en, hi, mr, ta, bn) |

## Known limits

- **Translations:** Hindi, Marathi, Tamil and Bengali are machine-drafted and need native review (`TRANSLATIONS.md`).
- **Live AI** is built and tested against mocks, but hasn't been run with a real key.
- **One device:** the rep app and manager desk share data on the same device. A real pilot needs a backend; it plugs in as a `SyncTransport` in `src/data/sync.ts`.
- **Lighthouse** was run in light mode. Dark and outdoor colours were checked by contrast calculation (all at least 4.5:1).
- **Pilot proposals, not policy:** thresholds, recovery-value shares and packaging weights are design starting points, not L'Oréal policy.
