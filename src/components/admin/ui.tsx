"use client";

// Shared form/layout bits for the /admin CMS.

export const INPUT = "w-full rounded-md border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-black";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="text-xs text-black/50">{hint}</span>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-[#7A124F] text-white hover:bg-[#5e0d3c]",
    ghost: "bg-black/5 text-black hover:bg-black/10",
    danger: "bg-red-50 text-red-700 hover:bg-red-100",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${styles}`}
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-9 rounded-lg bg-black/5 text-sm hover:bg-black/10 disabled:opacity-30"
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      {children}
    </button>
  );
}

export function Notice({ tone, children }: { tone: "error"; children: React.ReactNode }) {
  return <p className={`mb-4 rounded-lg px-3 py-2 text-sm ${tone === "error" ? "bg-red-50 text-red-800" : ""}`}>{children}</p>;
}

export function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">{children}</div>;
}
