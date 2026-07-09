# Show Up

**Show Up is the personal operating system for ad tech professionals on the move** — whether you're actively job searching or leveling up where you are, it combines daily accountability tools, a full pipeline and network tracker, and an AI-powered skill coach that builds your ad tech expertise session by session, getting harder as you improve.

Built for the people who already know the industry and want to get sharper: track your search from prospect to offer, stay consistent through the slow grind, and use The Coach to close the knowledge gaps — programmatic, header bidding, clean rooms, SPO, attention metrics — that actually come up in interviews and on the job.

Runs entirely in the browser with no install and no build step. AI features and the Read tab's article fetching go through a small Firebase Cloud Functions backend; everything else works offline against local storage.

---

## Features

### Daily rhythm
- **Daily check-in** — Set your energy level each morning (Light / Regular / Full Send / Rest Day) to calibrate what you aim for
- **Today's Focus** — Pin 1–3 tasks from your backlog into a focused daily list; projects show the next actionable step
- **Interview day mode** — When Google Calendar detects an interview or phone screen, a prominent encouragement card appears at the top of Today
- **Google Calendar sync** — Pull today's events into the Today tab via OAuth2 to see how busy the day really is; events are clickable back to Google Calendar
- **Calendar follow-up wizard** — Click "＋ follow up" on any calendar event to instantly generate a checklist of follow-up tasks (thank-you note, debrief, LinkedIn connect, check-in reminder, etc.) based on the event type
- **Habits** — Track workouts, journaling, and time outside, plus your own custom habits; link any habit to a Life Area (Health, Finance, Learning, Relationships, Home) and see per-area tracking in Progress
- **Focus timer** — Timed 25-minute work sessions with manual session logging
- **Today's win** — Log one small thing that went well each day

### Tasks & projects
- **Task backlog** — Categorized tasks: Apply, Follow Up, Network, Research, Admin, Personal, Scheduling
- **Undo** — Accidentally checked off a task? Tap "Undo" in the toast that appears (Today tab and Tasks tab)
- **Projects (subtasks)** — Break any task into steps; project cards show a progress bar and surface the next action. High-effort tasks (4–5 pts) auto-prompt for steps
- **Effort points** — 1–5 scale on each task; sprint capacity bar shows weekly load vs. target
- **Week goal linking** — Tag any task or project to a week plan goal; the week plan view shows linked tasks and remaining points per goal
- **In-progress marking** — Flag tasks actively being worked on across multiple days
- **Lists** — Freeform lists (companies to research, questions to ask, reading list, etc.) alongside the task backlog, with icon/color customization
- **Eisenhower Matrix** — Sort tasks into Do First / Schedule / Delegate / Drop by importance and urgency

### Network & pipeline
- **Contact tracker** — Log contacts, track last interactions, set follow-up cadences, and get nudges when someone is overdue
- **LinkedIn import** — Import your LinkedIn connections export (Connections.csv) to curate and add contacts in bulk; highlights connections at your target companies before anything is saved
- **Cross-tab navigation** — People, Pipeline, and Companies are fully linked: tap any person, job, or company to jump directly to the relevant card in the other tab
- **Duplicate detection** — Show Up warns you before you add a contact or pipeline entry that already exists
- **Pipeline** — Track job applications by stage (Prospect → Applied → Phone → Interview → Offer); includes prep and debrief tabs per entry
- **Prep notes import** — In any pipeline entry's Prep tab, paste your Google Doc, notes, or LinkedIn text and the AI parses it into the structured prep fields (interviewers, questions, STAR stories, questions to ask)
- **Companies** — Research and track target companies with status, industry, notes, linked contacts, and applied jobs
- **Company headlines (AI)** — Inside any expanded company card, fetch recent relevant news headlines powered by the Claude API

### Planning & reflection
- **Weekly planning** — Set 3 goals + an intention on Mondays; check off goals throughout the week
- **Friday wrap-up** — Guided weekly review with stats, reflection prompts, and carry-forward notes
- **Journal** — Daily journal entries with a monthly calendar view
- **Wins log** — Running log of small wins across the search

### Progress & motivation
- **XP & levels** — Earn XP for completing tasks, logging focus sessions, and checking in daily. 15 levels from "Just getting started" to "Legend"
- **Streaks** — Daily show-up streak with a compassionate 2-day grace rule
- **Achievements** — Unlock badges for milestones

### Read (news briefing)
- **Curated industry news** — Pulls headlines from your configured RSS sources (add, remove, and enable/disable feeds)
- **AI digest** — Optional Claude-generated summary of what matters across today's articles
- **Filtering** — Filter by source and by recency (today / this week / all)

### The Coach (AI)
- **Skill assessments** — Diagnostic quizzes on ad tech, digital media, and product topics powered by the Claude API, including built-in skills and your own free-form topic suggestions
- **Adaptive difficulty** — On your first session with a skill, you describe what you know and get calibrated questions. On return sessions, The Coach picks up where you left off with harder questions targeting your weak spots
- **Session history** — Every session logs your score, level assessment, focus areas, and recommended next step — all visible before your next session
- **Session analytics** — Track your score and level progression across sessions per skill

### Infrastructure
- **Cloud sync** — Optional Firebase Realtime Database sync across devices via Google sign-in
- **PIN lock** — Optional 4-digit PIN screen to protect the app on a shared or unlocked device; PINs are hashed, not stored in plaintext
- **Preview / sandbox mode** — Try the app with seeded demo data without creating an account or touching real calendar sync
- **Internal analytics** — Lightweight event tracking (authenticated users only): `app_open`, `tab_view`, `task_add`, `task_complete`, `energy_set`, `focus_block`, `win_logged`, `gcal_sync`
- **Export / Import** — Full JSON backup and restore

---

## Setup

1. Download or clone this repo
2. Open `index.html` in any modern browser
3. On iOS/iPadOS: **Share → Add to Home Screen** for a full-screen PWA experience

All data is stored locally in `localStorage` by default — nothing leaves your device unless you sign in. AI features (The Coach, Briefing digest, prep notes import) and RSS article fetching require signing in with Google, since they go through the app's Firebase Cloud Functions backend.

---

## Optional integrations

### Cloud sync (Firebase)
Sign in with Google in the Account tab to sync your data across devices via Firebase Realtime Database. The app ships with a configured Firebase project — just sign in.

### AI features (Claude API)
Powers The Coach skill assessments, prep notes import, company headline fetching, the JD analyzer, and the Briefing digest. Calls are proxied through a Firebase Cloud Function with a shared server-side key — no API key setup needed, just sign in with Google in the Account tab. Each signed-in user gets a daily rate limit on AI calls and on Briefing article fetches.

### Google Calendar
Pull today's events into the Today tab so you can see your schedule at a glance. Events are clickable back to Google Calendar. The app also detects interview keywords and surfaces an encouragement card when one is found.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and open your project
2. Enable the **Google Calendar API**
3. Create an **OAuth 2.0 Client ID** (Web application) under APIs & Services → Credentials
4. Add your app's hosted URL as an authorized JavaScript origin
5. Go to **Account → Google Calendar** in Show Up and paste the Client ID
6. Click **Connect Google Calendar**

---

## User flow: logging a meeting and its follow-ups

There are a few paths — here's when to use each:

| Situation | What to do |
|-----------|-----------|
| **Had an interview** | After the event, click "＋ follow up" on the calendar event → select tasks (debrief, thank-you, LinkedIn, check-in). Separately, open the Pipeline entry and fill in the Debrief tab. |
| **Met someone at a networking event** | Click "＋ follow up" on the calendar event → generates follow-up tasks. Then open People → Add contact to log them for ongoing tracking. |
| **Already logged a contact, want to log the meeting** | Open their contact card → Log interaction (date, method, notes). Set a follow-up date if needed. |
| **Planning a future follow-up** | In the contact card, use the "Planned follow-up" date field. This surfaces them in the overdue/due-soon filter. |
| **Ad hoc follow-up task** | Add directly in Tasks → "Follow Up" category. |

---

## Tech

Frontend is a single HTML file — HTML, CSS, and vanilla JavaScript. No frameworks, no build step.

**External dependencies (all CDN, all optional-graceful):**
- Firebase 9 (auth + realtime database) — for cloud sync
- Google Identity Services — for Calendar OAuth2
- Google Fonts (Montserrat, DM Sans)

**Backend (`functions/`):** Firebase Cloud Functions (Node 20) — `callClaude` proxies Claude API requests with a shared server-side key and a per-user daily rate limit; `fetchUrl` fetches RSS/article content server-side (with SSRF guards) to work around browser CORS restrictions, also rate-limited per user. Both require a valid Firebase auth token.
