"use client"

import { useMemo, useState } from "react"

import { Badge } from "./Badge"
import { CopyButton } from "./CopyButton"

function outcomeLabel(outcome: "yes" | "no" | "yes_with_caveats") {
  if (outcome === "yes") return "Confident recommendation"
  if (outcome === "no") return "Refused"
  return "Hedged"
}

export function EvidenceCard({
  prompt,
  answer,
  outcome,
  extract,
  url,
  provider,
  model,
  anchorId,
  className,
}: {
  prompt: string
  answer: string
  outcome: "yes" | "no" | "yes_with_caveats"
  extract?: string
  url?: string
  provider?: string
  model?: string
  anchorId?: string
  className?: string
}) {
  const [showFullAnswer, setShowFullAnswer] = useState(false)
  const derivedExtract = useMemo(() => {
    if (extract && extract.trim()) return extract.trim()
    return answer.trim().slice(0, 200)
  }, [answer, extract])
  const copyText = `Prompt: ${prompt}\nOutcome: ${outcomeLabel(outcome)}\nAnswer: ${answer}`
  const copyExtract = `Extract: ${derivedExtract}`

  return (
    <div
      id={anchorId}
      className={`rounded-xl border bg-background p-4 ${className ?? ""}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Observed outcome: {outcomeLabel(outcome)}</Badge>
            {provider ? (
              <Badge>{provider}{model ? ` / ${model}` : ""}</Badge>
            ) : null}
            {url ? <Badge>{url}</Badge> : null}
            {anchorId ? (
              <a
                href={`#${anchorId}`}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                #{anchorId}
              </a>
            ) : null}
          </div>

          <div className="text-sm">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Prompt
            </div>
            <div className="mt-1 font-mono text-[13px] leading-5">{prompt}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <CopyButton text={copyExtract} label="Copy extract" />
          <CopyButton text={copyText} label="Copy all" />
        </div>
      </div>

      <div className="mt-4 rounded-lg border bg-muted/20 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Extract
        </div>
        <div className="mt-2 text-base leading-7">{derivedExtract}</div>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowFullAnswer((prev) => !prev)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {showFullAnswer ? "Hide full answer" : "Show full answer"}
        </button>
      </div>

      {showFullAnswer ? (
        <div className="mt-3 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Answer
          </div>
          <div className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {answer}
          </div>
        </div>
      ) : null}
    </div>
  )
}
