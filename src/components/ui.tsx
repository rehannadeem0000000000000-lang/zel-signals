"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-[0_18px_60px_-28px_rgba(0,0,0,0.9)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400/80">{eyebrow}</p>
        ) : null}
        <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p> : null}
      </div>
      {right}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3.5 text-base",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.8)] hover:brightness-110",
    ghost: "bg-white/5 text-slate-200 hover:bg-white/10",
    outline: "border border-white/15 text-slate-200 hover:border-white/35 hover:bg-white/5",
    danger: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25",
  };
  return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
        {hint}
      </span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 placeholder:text-slate-600";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Select({ className = "", children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputBase} appearance-none bg-slate-950/70 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Chip({
  active,
  children,
  onClick,
  tone = "cyan",
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  tone?: "cyan" | "emerald" | "rose" | "violet";
}) {
  const activeTone = {
    cyan: "border-cyan-400/60 bg-cyan-400/15 text-cyan-200",
    emerald: "border-emerald-400/60 bg-emerald-400/15 text-emerald-200",
    rose: "border-rose-400/60 bg-rose-400/15 text-rose-200",
    violet: "border-violet-400/60 bg-violet-400/15 text-violet-200",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active ? activeTone : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "rose" | "amber" | "cyan" | "violet";
}) {
  const tones = {
    slate: "bg-white/5 text-slate-300 border-white/10",
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-400/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
    violet: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
      {label}
    </span>
  );
}
