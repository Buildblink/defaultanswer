import type { ReactNode } from "react"

import { MarketingHeader } from "@/components/marketing/MarketingHeader"

export default function InsightsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      {children}
    </div>
  )
}
