---
name: insurvoice-call-scorer
description: Evaluate and audit Insurvoice.ai sales calls using the official AE Sales Call Scorecard (Rubric v1.0, Workbook v1.2). Use this skill to analyze call transcripts, verify the 26 checkpoints (Y/N/N/A) with transcript evidence, calculate weighted scores using the 60/40 formula, and calibrate AI call scoring.
---

# Insurvoice.ai — AE Sales Call Scorecard (Rubric v1.0)

Official standard for evaluating Account Executive (AE) sales calls at **Insurvoice.ai** (Workbook v1.2, calibrated by Kyle & Adithya).

---

## 1. Core Calibration Rules (CRITICAL)

1. **Evidence Rule:**
   - Score **ONLY observable behavior** supported by a quote in the transcript, not intent (*"Score the behavior you can evidence in the transcript, not intent"*).
   - For each of the 26 checkpoints, you must provide `"result": "Y" | "N" | "N/A"` and `"evidence"` (a brief verbatim quote or specific fact from the dialogue).
   - **No evidence in the transcript = score it strictly `"N"`** (*"Every score needs a quote or timestamp. No evidence = score it N"*). Never assume or infer facts that were not spoken on the call.

2. **Voicemail / Call Screening Rule:**
   - If the call reached voicemail (*"Please leave your message..."*, *"after the tone"*), an AI call-screening assistant (*"Record your name and reason for calling, I'll see if this person is available"*, *"This person is not available"*), or lasted under 20 seconds without a two-way conversation — set `"isVoicemailOrUnconnected": true`. Such calls are treated as `N/A` and do not penalize the AE's score.

3. **When to Use `"N/A"` (Not Applicable):**
   - **Short Confirmation / Pre-Call (1–4 min phone call before a scheduled Google Meet):**
     If the AE calls to confirm the time of an already booked Google Meet / Zoom meeting (*"booked a meeting for 08:45 Pacific, just wanted to confirm that time"*) and does brief pre-qualification:
     - Set `"callType": "Confirmation / Pre-Call"`.
     - Checkpoint `1.1` = `"Y"` if the AE introduced themselves and stated the goal of the call (confirming the meeting time).
     - Checkpoint `2.1` = `"Y"` if the AE learned the insurance line (e.g., `life insurance`) and the agent's experience level.
     - Checkpoint `2.2` = `"Y"` if the AE asked about existing leads/book of business and clarified that Insurvoice does not sell leads, but qualifies them using AI.
     - Checkpoint `6.4` = `"Y"` if the prospect confirmed attendance for the scheduled Google Meet.
     - All full-meeting stages deferred to the upcoming Google Meet (*"We'll discuss more during the meeting"*) — tech stack (`2.3`), competitors (`2.4`), decision makers (`2.5`), 12-month loss math (`3.1–3.4`), Demo (`4.1–4.4`), and asking for the sale (`6.1–6.3`) — must be scored STRICTLY **`"N/A"`** (not `"N"`!).
   - **Precedent `C-002` (Fresh / Brand-New Insurance Agent):**
     If the prospect states they are a brand-new agent or restarting from scratch (*"I'm new"*, *"starting fresh"*) and has no active book or historical metrics yet:
     - Checkpoint `2.1` = `"Y"` (identified the niche and that the agent is brand new).
     - Checkpoints `3.1`, `3.2`, `3.3` = **`"N/A"`** (since a brand-new agent has no historical lead, quote, or commission counts).
   - **No Demo (`4.1–4.4`) or No Objections (`5.1–5.3`):**
     - If no product presentation/demo took place on the call — score all checkpoints `4.1–4.4` as **`"N/A"`** (never score `"Y"` for `4.2` and `4.3` if no demo occurred at all!).
     - If the prospect raised no objections — score `5.1–5.3` as **`"N/A"`**.

---

## 2. Scoring Formula & Call Type Weights

1. **Section Score:**
   $$\text{Section Score} = 0.60 \times \frac{\text{Checkpoints Y}}{\text{Checkpoints Y + N}} + 0.40 \times \frac{\text{Quality Rating (1..5)}}{5}$$
   *(Sections with 0% weight or where all checkpoints are `N/A` are excluded, and the remaining active section weights are proportionally rescaled to 100%).*

2. **Section Weights by Call Type:**

| Section | `Confirmation / Pre-Call` | `Discovery` | `Demo` | `Discovery + Demo` | `Follow-up / Close` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Opening & Rapport** | 25% | 15% | 10% | **10%** | 5% |
| **2. Discovery** | 35% | 35% | 15% | **25%** | 10% |
| **3. Pain & Impact** | 0% | 25% | 20% | **20%** | 15% |
| **4. Solution Fit / Demo** | 0% | 0% | 25% | **15%** | 10% |
| **5. Objection Handling** | 10% | 5% | 10% | **10%** | 25% |
| **6. Close & Next Steps** | 20% | 15% | 15% | **15%** | 30% |
| **7. Presence** | 10% | 5% | 5% | **5%** | 5% |

3. **Score Bands (`Band`):**
   - **85%+** — `Strong`
   - **70–84%** — `Solid`
   - **55–69%** — `Needs Coaching`
   - **< 55%** — `Priority Focus`

---

## 3. 7-Section Rubric (Quality Rating 1–5) & 26 Checkpoints

*(Use 2 and 4 when performance sits between the anchors below).*

### Section 1: Opening & Rapport
- **Level 5 (Strong):** Confirms time, sets a clear agenda and states the goal of the call. Asks what prompted the inquiry and how the prospect pictures using AI. Opens agency discovery with an open-ended question (*"Tell me about your agency"*) and builds on their story (how they started, size, staff). Prospect talks more than the AE in the first 5 minutes.
- **Level 3 (Acceptable):** Friendly and professional, but skips the agenda or asks narrow/leading questions about the agency (*"Are you P&C or L&H?"*).
- **Level 1 (Needs Work):** Jumps straight into pitching or demoing. No agenda set, no curiosity about the agency.
- **Checkpoints:**
  - `1.1` — Set the agenda, time available and goal for the call (merely stating "we have 30 minutes" on a full call without an agenda is `N`).
  - `1.2` — Asked what prompted the inquiry and how they picture using AI.
  - `1.3` — Opened agency discovery with an open-ended question (*"Tell me about your agency"*), not a leading/closed one (asking *"Are you P&C or L&H?"* or *"Are you a life insurance agent?"* without an open question is `N`).

### Section 2: Discovery
- **Level 5 (Strong):** Maps the full agency: book mix (P&C / L&H), # clients and active policies, lead sources (referrals, social, paid), current calling/follow-up process and who handles it, tech stack (AMS/CRM: EZLynx, GHL), language needs (e.g., Spanish-speaking). Asks how long they've looked at AI and who else they've evaluated. Identifies all decision makers and the approval process (e.g., 90-day pilot, board sign-off). Asks thoughtful follow-ups instead of reading a checklist.
- **Level 3 (Acceptable):** Covers basics (size, mix, lead sources) but misses competitors or decision process. Follow-up questions are surface-level.
- **Level 1 (Needs Work):** Few or no discovery questions; assumes needs and pitches generic features.
- **Checkpoints:**
  - `2.1` — Learned book mix and size (P&C / L&H split, # clients, staff).
  - `2.2` — Learned lead sources and current calling / follow-up process.
  - `2.3` — Learned tech stack (AMS / CRM, e.g. EZLynx, GHL).
  - `2.4` — Asked how long they've considered AI and who else they've evaluated.
  - `2.5` — Identified decision maker(s) and buying / approval process.

### Section 3: Pain & Impact
- **Level 5 (Strong):** Turns every pain into hard numbers: *"10 after-hours leads a week, you quote 6, close 2 — so ~500 leads a year."* Gets show rate, close rate, and average premium/commission to calculate opportunity cost. Quantifies secondary pains too (hiring, training, seasonal turnover). Gets the prospect to state the cost of the problem in their own words.
- **Level 3 (Acceptable):** Identifies pains and collects some numbers, but leaves them as percentages, doesn't annualize over 12+ months, or doesn't translate into dollars.
- **Level 1 (Needs Work):** Pains are acknowledged (*"Yeah, that's tough"*) with zero numbers attached.
- **Checkpoints:**
  - `3.1` — Got hard counts (leads, quotes, closes), not just percentages.
  - `3.2` — Got average premium or commission per sale.
  - `3.3` — Projected the loss over 12+ months (made the number big).
  - `3.4` — Prospect stated the cost of the problem in their own words.

### Section 4: Solution Fit / Demo
- **Level 5 (Strong):** Shows only what solves the pains the prospect stated and echoes their exact words (*"You mentioned after-hours leads — here's how that works..."*). Uses real agency case studies to explain why it's built for insurance. Explains data setup in plain language (uploading a CSV with name, address, prior policies). Discusses integrations/APIs only if asked. Never promises future features or integrations.
- **Level 3 (Acceptable):** Generic feature walkthrough; brings up unprompted technical topics or misses chances to tie features back to stated pains.
- **Level 1 (Needs Work):** Feature dump or confusing technical jargon; promises future features or integrations that do not exist today.
- **Checkpoints:**
  - `4.1` — Demo tied directly to pains the prospect stated.
  - `4.2` — No unprompted technical topics (integrations, open API, back end). Score `N` if the AE brought up CRM/API integrations unprompted.
  - `4.3` — No promises of future features or integrations (e.g., promising upcoming EZLynx / GHL integrations).
  - `4.4` — Explained data and setup (CSV upload) in plain language.

### Section 5: Objection Handling
- **Level 5 (Strong):** Acknowledges the objection, asks a clarifying question to uncover the real concern, answers with a relevant point (implementation period for "no time to try it", recording compliance, branded Caller ID label for "nobody answers unknown numbers"), and explicitly confirms the concern is resolved (*"Does that address it?"*).
- **Level 3 (Acceptable):** Answers the objection, but doesn't confirm with the prospect that the concern is resolved.
- **Level 1 (Needs Work):** Gets defensive, argues, brushes past the objection, or immediately discounts the price.
- **Checkpoints:**
  - `5.1` — Acknowledged and clarified the objection (found the real concern).
  - `5.2` — Answered with a relevant point (implementation period, compliance, caller ID label, etc.).
  - `5.3` — Confirmed the objection was resolved (without asking *"Does that make sense / address it?"*, score `N`).

### Section 6: Close & Next Steps
- **Level 5 (Strong):** Frames ROI using the prospect's own numbers (*"1–2 sales covers it"* — specifically sales, not "commission checks"). Summarizes value, removes risk (*"We build the agent, run onboarding, and set up the number"*), asks directly for the business with a specific start date (*"We can get you started Monday — does that work?"*) and waits for the answer. If not ready to buy today, books a concrete date and time for the next meeting with all decision makers before hanging up.
- **Level 3 (Acceptable):** Books a follow-up meeting but never explicitly asks for the sale, or leaves the next step vague (*"I'll send over some info"*).
- **Level 1 (Needs Work):** Call ends without asking for the sale and without a dated next step on the calendar.
- **Checkpoints:**
  - `6.1` — Framed ROI with the prospect's own numbers (*"1-2 sales covers it"*).
  - `6.2` — Explicitly asked for the sale.
  - `6.3` — Proposed a specific start date (e.g., *"Monday"*, not a vague *"next week"*).
  - `6.4` — Booked or confirmed a dated next meeting before the call ended.

### Section 7: Presence
- **Level 5 (Strong):** Professional delivery. Matches the prospect's pace and tone while keeping genuine energy and enthusiasm. Lets the prospect finish every sentence without talking over them. Stays composed on technical questions and keeps the call focused with clear framing. Never mentions being "new to the company."
- **Level 3 (Acceptable):** Professional, but flat/monotone or occasionally talks over the prospect.
- **Level 1 (Needs Work):** Frequently interrupts, sounds unsure, rambles in long monologues, or loses control of the call.
- **Checkpoints:**
  - `7.1` — Let the prospect finish their sentences (no talking over).
  - `7.2` — Matched the prospect's pace and tone.
  - `7.3` — Showed energy, enthusiasm and confidence throughout.
