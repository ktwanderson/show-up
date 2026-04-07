# Show Up

A single-file personal productivity app built for job seekers. Helps you show up consistently — tracking daily energy, tasks, networking, and weekly goals in one place.

Runs entirely in the browser with no install, no backend, and no dependencies.

---

## Features

- **Daily check-in** — Set your energy level each morning (Light / Regular / Full Send / Rest Day) to calibrate what you aim for
- **Today's Focus** — Pull 1–3 tasks from your backlog into a focused daily list
- **Task Backlog** — Categorized tasks across Apply, Follow Up, Network, Research, Admin, Personal, and Scheduling
- **Network tracker** — Log contacts, track last interactions, set follow-up dates, and route follow-up tasks directly to today or the backlog
- **Weekly planning** — Set 3 goals + an intention on Mondays; track and check off goals throughout the week; do a Friday wrap-up review
- **Focus timer** — Timed work sessions with session tracking
- **AI Coach** — Diagnostic skill assessments powered by the Claude API; starts with a free-text definition question and generates calibrated follow-up questions
- **Journal & wins log** — Daily journal entries and a running log of small wins
- **Quests & skills** — XP-based skill progression with learning sessions
- **Achievements & streaks** — Badges and streak tracking to reward consistency

---

## Usage

1. Download or clone this repo
2. Open `index.html` in any modern browser
3. On iOS/iPadOS, use **Share → Add to Home Screen** for a full-screen app experience

All data is stored locally in `localStorage` — nothing leaves your device.

### AI Coach (optional)

The AI Coach feature uses the [Claude API](https://console.anthropic.com/). To enable it:

1. Get an API key from Anthropic
2. In Show Up, go to **Account** and paste your API key

---

## Tech

Single HTML file — HTML, CSS, and vanilla JavaScript. No frameworks, no build step, no server required.
