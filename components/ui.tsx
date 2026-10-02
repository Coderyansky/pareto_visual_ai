"use client";

import clsx from "clsx";
import type { ReactNode } from "react";

/** Pill segmented control; the active option is an inverted (solid) pill. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = "sm",
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "xs";
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.03] p-0.5 ring-1 ring-inset ring-black/[0.06]"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={clsx(
              "inline-flex items-center gap-1 rounded-full whitespace-nowrap transition-colors duration-150",
              size === "sm" ? "h-7 px-3 text-[12px]" : "h-6 px-2.5 text-[11.5px]",
              active
                ? "bg-white font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-inset ring-black/[0.08]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Overline section label: 10–11px uppercase muted. */
export function Overline({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10.5px] font-medium tracking-[0.06em] text-muted-foreground uppercase">{children}</span>
      {action}
    </div>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
  title,
  active,
  ...rest
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  active?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={rest["aria-label"] ?? title}
      className={clsx(
        "inline-flex h-7 items-center justify-center gap-1.5 rounded-full text-[12px] ring-1 ring-inset transition-colors duration-150",
        active
          ? "bg-foreground text-white ring-foreground"
          : "text-foreground/85 ring-black/[0.1] hover:bg-black/[0.04]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground"
    >
      <span
        className={clsx(
          "relative h-[18px] w-[30px] rounded-full ring-1 ring-inset transition-colors duration-150",
          checked ? "bg-foreground ring-foreground" : "bg-black/[0.06] ring-black/[0.08]",
        )}
      >
        <span
          className={clsx(
            "absolute top-[2px] left-[2px] size-[14px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-transform duration-200 ease-out-fluid",
            checked && "translate-x-3",
          )}
        />
      </span>
      {label}
    </button>
  );
}
