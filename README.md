# Tactical Hub Pro 2026/27

A dependency-free match-analyst dashboard for **Serie A** and **Premier League 2026/27**, with live ESPN sync through a local anti-CORS server, a formation-aware live-XI mapper, dual radar cards, advanced stats and an 11v11 tactical matchup board.

The app runs entirely with native ES Modules: no build step, no bundler and no runtime dependencies.

---

## Quick start

Requirements: **Node.js 18+**.

```bash
npm start
```

Equivalent direct command:

```bash
node server/server.js
```

Then open:

```text
http://127.0.0.1:8787/
```

Windows: double-click `start.bat`.
macOS/Linux: `./start.sh` (make it executable once with `chmod +x start.sh`).

`npm install` is **not** required — the project has zero dependencies.

Optional port override:

```bash
PORT=8788 node server/server.js
```

PowerShell:

```powershell
$env:PORT=8788; node server/server.js
```

---

## What is included

### Leagues and data

- **Serie A 2026/27** — 20 teams, current coaches, real last-match XIs, standings, team stats, player stats, radar profiles, set pieces, ballots and dossiers.
- **Premier League 2026/27** — 20 teams with the same complete data model (Arteta, Maresca, Iraola, Alonso, Jaissle, De Zerbi, etc.).
- **Resto del Mondo** — additional league slot with Al-Hilal and the same rendering pipeline, ready to extend.
- Per-league isolated storage: every league keeps its own UI state, rosters, last-match cache and compact match cache under `th:<league>:*`.
- Hybrid sync:
  1. local server (`/api/espn/...`) when online;
  2. direct ESPN request when the server is unavailable;
  3. per-league `localStorage` snapshot;
  4. bundled 2026/27 baseline.

### Tabs

1. **Lavagna Tattica 11** — pitch with Base / Possesso / Non Possesso phases, animated arrows, tactical zones, Zone 14, `XI Ultima Gara`, HUD, real boxscore and next match, set pieces and clickable ballots.
2. **Matchup 11v11** — 22 draggable players, freehand arrows, clear/reset, SVG and PNG export.
3. **DNA, Radar & Come Gioca** — dual DataScout-style SVG radars, EN/IT labels, tooltips, downloads, metrics, strengths/weaknesses and dossier.
4. **Classifica Live** — 20-team live standings with form and zone colouring.
5. **Statistiche Squadre** — 5 KPI cards, 4 sortable views (Generale, Attacco, Possesso, Difesa), team search.
6. **Giocatori, Marcatori & Assist** — top scorers, top assists and 14 filterable player categories with team filter and search.

### Global tools

- **Ctrl+K** search across players, coaches and teams in every league.
- Radar card export: **SVG** and **PNG**.
- Full pitch export: **SVG** and **PNG**.
- Matchup export: **SVG** and **PNG**.
- Desktop/mobile toggle in the header, plus the first-run device modal.

---

## Live-XI mapper

`assignStartersToSlots(starters, team, targetMod)` in `js/mapper.js`:

- derives the **source formation** from `team.lastMatch.matchFormation`;
- uses ESPN `formationPlace` (`fp`) ordering when source and target shapes match, then validates every assignment with `slotAcceptsFp`;
- otherwise runs a Hungarian assignment with strict family constraints;
- never places a centre-back or full-back in midfield/attack;
- never places a midfielder at striker;
- interprets ambiguous ESPN tags (`LM/RM`, `AM-R/AM-L`, `CF-R/CF-L`) using the **source/live formation**;
- adapts automatically when the last-match formation differs from the team’s base formation.

The UI calls it with `renderCampo(team, cached.starters, cached.matchFormation)` and falls back to the bundled XI when live data is unavailable.

Verified against all 40 Serie A + Premier League teams.

---

## Project structure

```text
.
├── index.html                  # App shell, tabs, modals, inline device bootstrap
├── css/
│   └── style.css               # Legacy UI + matchup/search/selector styles
├── js/
│   ├── app.js                  # Boot, league/team selection, tabs, Ctrl+K, window bindings
│   ├── core.js                 # State, league runtime, localStorage, search index
│   ├── sync.js                 # Hybrid server/ESPN sync and caches
│   ├── mapper.js               # Formation-aware XI mapper (Hungarian + fp validation)
│   ├── formations.js           # SLOT_SPECS, FP_SLOT_MAP, FORMATIONS, radar labels
│   ├── pitch.js                # Pitch, phases, arrows, ballots, pitch export
│   ├── radar.js                # Dual radar cards, tooltips, EN/IT, downloads
│   ├── stats.js                # Standings, KPIs, team/player tables
│   ├── matchup.js              # 11v11 board, drag/drop, freehand, exports
│   └── export.js               # Dependency-free SVG/PNG download helpers
├── data/
│   ├── index.js                # League registry
│   ├── serie_a.js              # Serie A 2026/27 dataset
│   ├── premier_league.js       # Premier League 2026/27 dataset
│   └── resto_mondo.js          # Resto del Mondo dataset
├── server/
│   ├── server.js               # Static server + CORS ESPN proxy + metrics + disk cache
│   └── cache/                  # Generated JSON cache (safe to delete)
├── tests/
│   ├── mapper.test.js          # 11v11 role/formation constraints
│   └── live_xi.test.js         # Live-XI validation for all 40 teams
├── package.json
├── start.bat
└── start.sh
```

Development-only helpers are prefixed with `_` (`_build_data.py`, `_build_shell.py`, raw ESPN snapshots, legacy extraction files) and are **not needed at runtime**.

---

## Tests

Run both suites:

```bash
npm test
```

Or individually:

```bash
node tests/mapper.test.js
node tests/live_xi.test.js
```

Current results:

```text
Tactical mapper — 11v11 role constraints
  9 passed, 0 failed

Live XI mapper — 14 passed, 0 failed
  (including all 20 Serie A and all 20 Premier League teams)
```

The live-XI suite validates every team’s 11 starters against the target formation, checks unique players and catches role leaks (defenders in attack, midfielders at striker, etc.).

---

## Server API

The local server listens on `127.0.0.1:8787` by default.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Service status, Node version and cache directory |
| `GET /api/espn/<league>/<espn-path>` | CORS-enabled ESPN proxy; `<league>` is `ita.1`, `eng.1`, etc. |
| `GET /api/metrics/<league>?season=2026` | Derived standings metrics |
| `GET /api/advanced-metrics/<league>?season=2026` | Alias for the metrics endpoint |
| `GET /api/sync/<league>?season=2026` | Standings + news bundle for a league |

Cache behaviour:

- standings: 15 minutes
- news: 10 minutes
- scoreboard: 1 minute
- roster: 6 hours
- schedule: 30 minutes
- match summary: 30 seconds live, 7 days final, 1 hour otherwise
- default: 10 minutes

Responses are cached as JSON files in `server/cache/`, de-duplicated in flight, and served stale if ESPN is temporarily unreachable. `X-ESPN-Cache` reports `HIT`, `MISS` or `STALE`.

---

## Controls

| Action | Control |
| --- | --- |
| Switch league | Header: Serie A / Premier League / Resto del Mondo |
| Switch team | Coach dropdown |
| Global search | `Ctrl+K` |
| Change pitch phase | Base / Possesso / Non Possesso |
| Show live XI | `XI Ultima Gara` |
| Toggle all arrows | `Tutte le Frecce` |
| Toggle zones | `Zone Tattiche` |
| Swap ballot | Click a ballot row |
| Move matchup player | Drag a pin |
| Draw freehand arrow | Enable `Frecce Libere`, then drag on the board |
| Clear matchup arrows | `Cancella Frecce` |
| Reset matchup | `Reset` |
| Export | SVG / PNG buttons on pitch, radar cards and matchup |
| Mobile layout | Header `Mobile` / `PC` toggle |

---

## Notes

- The first full auto-sync can fetch around 100 match summaries. The server disk cache and the per-league `localStorage` caches make later loads fast.
- Use **Forza Sync Completo** to force a refresh.
- Live data comes from ESPN’s public endpoints; the bundled 2026/27 baseline keeps the app usable when the network or server is unavailable.
- The app is intentionally dependency-free. Only Node.js is required for the local server and tests.
