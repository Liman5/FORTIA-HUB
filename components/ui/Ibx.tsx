"use client";

import React from "react";

export type IbxButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export function IbxButton({
  variant = "primary",
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: IbxButtonVariant }) {
  return (
    <button {...props} className={`ibx-btn ibx-btn-${variant} ${className}`.trim()}>
      {children}
    </button>
  );
}

export function IbxInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`ibx-input ${props.className || ""}`.trim()} />;
}

export function IbxTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`ibx-input ${props.className || ""}`.trim()} />;
}

export function IbxBadge({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  className?: string;
  children: React.ReactNode;
}) {
  const toneClass = tone === "neutral" ? "" : `ibx-badge-${tone}`;
  return <span className={`ibx-badge ${toneClass} ${className}`.trim()}>{children}</span>;
}

export function IbxSurface({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`ibx-surface ${className}`.trim()}>{children}</div>;
}

export function IbxDivider({ className = "" }: { className?: string }) {
  return <div className={`ibx-divider ${className}`.trim()} />;
}

export function IbxSwitch({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="ibx-switch disabled:opacity-50"
      data-on={checked ? "true" : "false"}
    >
      <span className="ibx-switch-thumb" />
    </button>
  );
}
