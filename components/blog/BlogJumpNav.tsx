type JumpNavItem = {
  href: string;
  label: string;
};

type BlogJumpNavProps = {
  items: JumpNavItem[];
};

export function BlogJumpNav({ items }: BlogJumpNavProps) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Jump to
      </div>
      <ul className="mt-3 grid gap-2 text-sm text-stone-600 dark:text-stone-300 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="block rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-300 dark:hover:bg-stone-900"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
