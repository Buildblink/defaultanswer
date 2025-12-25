import type { ReactNode } from "react";

type LandingLayoutProps = {
  children: ReactNode;
  structuredData?: Record<string, unknown>;
};

export function LandingLayout({ children, structuredData }: LandingLayoutProps) {
  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      ) : null}

      {children}
    </>
  );
}
