# Show Up

A single-file personal productivity app built for job seekers. Helps you show up consistently — tracking daily energy, tasks, networking, and weekly goals in one place.

Runs entirely in the browser with no install, no backend, and no dependencies beyond optional cloud sync.

---

## Features

### Daily rhythm
- **Daily check-in** — Set your energy level each morning (Light / Regular / Full Send / Rest Day) to calibrate what you aim for
- **Today's Focus** — Pin 1–3 tasks from your backlog into a focused daily list; projects show the next actionable step
- **Interview day mode** — When Google Calendar detects an interview or phone screen, a prominent encouragement card appears at the top of Today
- **Google Calendar sync** — Pull today's events into the Today tab via OAuth2 to see how busy the day really is
- **Habits** — Track workouts, journaling, and time outside with configurable weekly/monthly goals
- **Focus timer** — Timed 25-minute work sessions with manual session logging
- **Today's win** — Log one small thing that went well each day

### Tasks & projects
- **Task backlog** — Categorized tasks: Apply, Follow Up, Network, Research, Admin, Personal, Scheduling
- **Projects (subtasks)** — Break any task into steps; project cards show a progress bar and surface the next action. High-effort tasks (4–5 pts) auto-prompt for steps
- **Effort points** — 1–5 scale on each task; sprint capacity bar shows weekly load vs. target
- **Week goal linking** — Tag any task or project to a week plan goal; the week plan view shows linked tasks and remaining points per goal
- **In-progress marking** — Flag tasks actively being worked on across multiple days

### Network
- **Contact tracker** — Log contacts, track last interactions, set follow-up cadences, and get nudges when someone is overdue
- **Pipeline** — Track job applications by stage (Prospect → Applied → Phone → Interview → Offer)
- **Companies** — Research and track target companies with status, industry, notes, linked contacts, and applied jobs
- **Company headlines (AI)** — Inside any expanded company card, fetch 3–5 recent relevant news headlines powered by the Claude API. Results are cached for 1 hour

### Planning & reflection
- **Weekly planning** — Set 3 goals + an intention on Mondays; check off goals throughout the week
- **Friday wrap-up** — Guided weekly review with stats, reflection prompts, and carry-forward notes
- **Journal** — Daily journal entries with a monthly calendar view
- **Wins log** — Running log of small wins across the search

### Progress & motivation
- **XP & levels** — Earn XP for completing tasks, logging focus sessions, and checking in daily
- **Streaks** — Daily show-up streak with a compassionate 2-day grace rule
- **Achievements** — Unlock badges for milestones
- **AI Coach** — Diagnostic skill assessments powered by the Claude API

### Infrastructure
- **Cloud sync** — Optional Firebase Realtime Database sync across devices via Google sign-in
- **Internal analytics** — Lightweight event tracking (authenticated users only) for future scaling: `app_open`, `tab_view`, `task_add`, `task_complete`, `energy_set`, `focus_block`, `win_logged`, `gcal_sync`
- **Export / Import** — Full JSON backup and restore

---

## Setup

1. Download or clone this repo
2. Open `index.html` in any modern browser
3. On iOS/iPadOS: **Share → Add to Home Screen** for a full-screen PWA experience

All data is stored locally in `localStorage` by default — nothing leaves your device unless you sign in.

---

## Optional integrations

### Cloud sync (Firebase)
Sign in with Google in the Account tab to sync your data across devices via Firebase Realtime Database. The app ships with a configured Firebase project — just sign in.

### AI features (Claude API)
Powers the AI Coach skill assessments and company headline fetching.

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/)
2. Go to **Account → AI Coach** and paste your key

### Google Calendar
Pull today's events into the Today tab so you can see your schedule at a glance. The app also detects interview keywords and surfaces an encouragement card when one is found.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and open your project
2. Enable the **Google Calendar API**
3. Create an **OAuth 2.0 Client ID** (Web application) under APIs & Services → Credentials
4. Add your app's hosted URL as an authorized JavaScript origin
5. Go to **Account → Google Calendar** in Show Up and paste the Client ID
6. Click **Connect Google Calendar**

---

## Tech

Single HTML file — HTML, CSS, and vanilla JavaScript. No frameworks, no build step, no server required.

**External dependencies (all CDN, all optional-graceful):**
- Firebase 9 (auth + realtime database) — for cloud sync
- Google Identity Services — for Calendar OAuth2
- Google Fonts (Montserrat, DM Sans)
