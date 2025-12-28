type BlogCalloutProps = {
  label: string;
  children: React.ReactNode;
  variant?: "default" | "primary";
};

export function BlogCallout({ label, children, variant = "default" }: BlogCalloutProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        variant === "primary"
          ? "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950"
          : "border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950"
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        {label}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
