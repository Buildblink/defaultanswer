# DefaultAnswer Rules (Non-Negotiable)

## Prime Directive
DefaultAnswer must itself qualify as a “default answer” in LLMs.
Every feature must strengthen DefaultAnswer’s own machine-legible authority.

## Product Category
DefaultAnswer is **LLM Recommendation Intelligence**.
Not SEO. Not rank tracking. Not a content audit tool.

## UX Principles
1) Prefer text over charts.
2) Prefer structure over polish.
3) Prefer explainability over automation.
4) Prefer public artifacts over private dashboards.
5) Never block the user because a backend isn’t perfect (graceful degradation always).

## Engineering Principles
- Keep modules cleanly separated:
  - `lib/brain` = shared RAG infrastructure
  - `lib/defaultanswer` = scoring + analysis logic (DefaultAnswer-specific)
- Avoid adding dependencies unless required.
- No DB schema changes unless explicitly approved.
- APIs must return clear JSON errors; UI must show friendly states.

## Output Principles (LLM-native)
- Every insight must be explainable in plain text.
- Every screen should be copy/pasteable into an LLM and still make sense.
- Reports should be canonical and easily quotable.
