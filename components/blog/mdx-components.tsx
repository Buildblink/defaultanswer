import type { ReactNode, ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Callout({
  title,
  variant = "note",
  children,
}: {
  title: string;
  variant?: "note" | "warning" | "claim";
  children: ReactNode;
}) {
  const variantStyles = {
    note: "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950",
    warning:
      "border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100",
    claim:
      "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 text-sm leading-relaxed",
        variantStyles[variant]
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
        {title}
      </div>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        {children}
      </div>
    </div>
  );
}

export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-2 border-stone-200 pl-4 italic text-stone-700 dark:border-stone-800 dark:text-stone-300">
      {children}
    </blockquote>
  );
}

export function KeyIdea({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-950">
      <div className="text-xs font-medium uppercase tracking-wider text-stone-500">
        {title}
      </div>
      <div className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        {children}
      </div>
    </div>
  );
}

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-stone-200 pt-8 dark:border-stone-800">
      <section id={id} className={cn("space-y-4", className)}>
        {children}
      </section>
    </div>
  );
}

export const mdxComponents = {
  h2: (props: ComponentProps<"h2">) => (
    <h2
      {...props}
      className={cn(
        "scroll-mt-24 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50",
        props.className
      )}
    />
  ),
  h3: (props: ComponentProps<"h3">) => (
    <h3
      {...props}
      className={cn(
        "text-lg font-semibold text-stone-900 dark:text-stone-50",
        props.className
      )}
    />
  ),
  p: (props: ComponentProps<"p">) => (
    <p
      {...props}
      className={cn("leading-relaxed text-stone-700 dark:text-stone-300", props.className)}
    />
  ),
  ul: (props: ComponentProps<"ul">) => (
    <ul
      {...props}
      className={cn("list-disc space-y-2 pl-5 leading-relaxed", props.className)}
    />
  ),
  ol: (props: ComponentProps<"ol">) => (
    <ol
      {...props}
      className={cn("list-decimal space-y-2 pl-5 leading-relaxed", props.className)}
    />
  ),
  a: (props: ComponentProps<"a">) => (
    <a {...props} className={cn("underline", props.className)} />
  ),
  blockquote: (props: ComponentProps<"blockquote">) => (
    <blockquote
      {...props}
      className={cn(
        "border-l-2 border-stone-200 pl-4 italic text-stone-700 dark:border-stone-800 dark:text-stone-300",
        props.className
      )}
    />
  ),
  Callout,
  Quote,
  KeyIdea,
  Section,
};
