# DefaultAnswer — PRD (V1 → V3)

## Vision
DefaultAnswer measures and improves whether AI assistants (ChatGPT/Claude/Perplexity/Gemini) recommend a brand as the *default* answer.

LLMs don’t “rank” — they **decide**.
We optimize for being chosen, not traffic.

---

## V1: Proof of Default (Working Core)
### Goal
Deliver a believable score + actionable fixes from a single URL submission.

### Must ship
- `/defaultanswer` landing with single CTA
- URL input validation + frictionless submit
- Lead capture API (never blocks)
- Score snapshot UI (can be placeholder)
- Basic analysis pipeline (can be stubbed) that produces:
  - Default Answer Score™ (0–100)
  - Top competitors AI prefers
  - 5–10 prioritized fixes (plain language)
- Shareable “report” output (even if basic)

### Out of scope
- Monitoring, alerts
- Enterprise dashboards
- Crawling at scale

---

## V2: Influence Engine (Moat)
### Goal
Explain *why* the model hesitates and what changes shift recommendations.

- Entity graph engine
- Narrative compression score
- Reasoning path simulation (where confidence leaks)

---

## V3: Market Authority Layer (Uncopyable)
### Goal
Become the reference infrastructure for LLM recommendation behavior.

- Public authority registry (verified entities + canonical descriptions)
- DefaultAnswer benchmark index (category-wide comparisons)
- Citation gravity loop (reports become references)

---

## Non-Functional Requirements
- App must run without crashing even if some env keys are missing.
- Graceful degradation everywhere.
- Prefer structured text output over visuals.

---

## Success Metrics (V1)
- URL submissions
- Email capture rate
- % users who request next step / upgrade
