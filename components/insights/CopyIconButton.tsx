"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export function CopyIconButton({
  text,
  label = "Copy",
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <button
      onClick={onCopy}
      className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      type="button"
      aria-label={label}
      title={label}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}
