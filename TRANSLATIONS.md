# Translations checklist

All UI strings live in `src/i18n/locales/{en,hi,mr,ta,bn}.json`. English is the source.
`npm test` fails if any locale is missing a key or has an empty string.

Hindi, Marathi, Tamil and Bengali were **machine-drafted** for this prototype.
Each must be checked by a native speaker, ideally someone who has worked in field sales, before any pilot.

| Locale | File | Status | Reviewer | Notes |
|---|---|---|---|---|
| English | `en.json` | Source | — | |
| Hindi | `hi.json` | ⚠️ Needs native review | | Check that sales terms (beat, act-by, godown) read naturally to reps |
| Marathi | `mr.json` | ⚠️ Needs native review | | |
| Tamil | `ta.json` | ⚠️ Needs native review | | "Flag" is translated as கொடி (literal); a field term may be better |
| Bengali | `bn.json` | ⚠️ Needs native review | | |

## What to check

- [ ] Tone: friendly and respectful, with **no blame language** (see DESIGN.md)
- [ ] Field vocabulary: reps often use English loanwords (stock, order, scheme). Prefer what they actually say over formal words.
- [ ] Status words: Green / Amber / Red. Amber is drafted as "yellow" in each language; confirm that works.
- [ ] Length: strings fit a 360 px screen without truncation
- [ ] Retailer WhatsApp drafts (`share.msg.*`) read like a person wrote them
- [ ] The sample voice note (`voice.sample`) sounds like real shop talk; the offline extractor's keywords in `src/ai/mock/voice.ts` cover how reps actually say these products and problems
- [ ] Footer disclaimer is legally accurate in every language

Mark a row ✅ with the reviewer's name once reviewed.
