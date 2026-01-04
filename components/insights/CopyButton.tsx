"use client"

import { useState } from "react"

export function CopyButton({
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
      className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
      type="button"
    >
      {copied ? "Copied" : label}
    </button>
  )
}
