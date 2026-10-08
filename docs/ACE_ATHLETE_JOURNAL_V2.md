# ACE Athlete Journal — UX Implementation v0.2

Status: implementation on branch feat/athlete-journal-ui-v2. Keep ACE a single product; Athlete remains a Biotope route (/athlete).

## Product goal
Make ACE Athlete feel like an athlete's own notebook rather than a questionnaire. Capture genuine training, bodily self-observation, and reflection without requiring lengthy essays. The visual concept is high-contrast premium training journal: midnight navy, warm gold CTAs, bright teal selection states, editorial serif headlines, and the athlete/track motif.

## Four functional screens
1. Home — today's entry points, real weekly data, current check-in summary, recent logs. No fabricated upcoming training or streak.
2. Note — date, title, type, minutes, focus, drill check-list (+ add/delete), perceived exertion RPE 1–10, optional free text, save/edit.
3. Check-in — energy, focus, body, sleep, mood 1–5, ACE micro-Quest choice, one optional goal. Pending check-in is attached to next new note.
4. Growth — seven-day load derived from duration × RPE, real history and confidence ratings, saved reflections, record edit/delete with confirmation, legacy Quest entries.

## Compatibility and privacy
- New localStorage keys: ace_athlete_journal_v2 and ace_athlete_pending_checkin_v2.
- The original ace_athlete_sessions_v1 key is NOT overwritten or migrated destructively. Entries are shown in the Growth screen as legacy observations.
- Existing Quest Router, /my-ace, and Vision > Milestone > Quest > Task hierarchy are unchanged.
- All notes remain device/browser-local; no Supabase syncing, coach sharing, tracking of notes, or affiliate prompts.
- RPE and state ratings are subjective and are never presented as medical or performance-diagnostic scores.
- No fabricated progress metrics; zero-state screens explain why there is no chart history yet.

## Release gate
- Verify Next.js 16 static export build.
- Run all Playwright E2E including 320px mobile flow: check-in → new note → reflection → reload, legacy display, edit and delete.
- Only merge into `dev` if tests pass. Per CLAUDE.md, `dev` is wired to production Cloudflare build.
- Confirm Cloudflare deployment and live link separately before claiming public availability.

## Next iteration candidates
Media attachments, voice-to-note, calendar/training plans, coaching permission controls, competition and training mode presets, and aggregated pattern discovery. None are implied to be implemented in v0.2.