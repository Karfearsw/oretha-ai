"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "gradient" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px] rounded-[10px] gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-[14px] gap-2",
  lg: "h-13 px-6 text-[16px] rounded-[16px] gap-2",
};

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gold text-canvas font-semibold hover:bg-gold-strong",
  gradient:
    "bg-gradient-to-r from-gold to-violet text-canvas font-semibold anim-grad-pan hover:opacity-90",
  ghost:
    "bg-transparent border border-white/12 text-cream hover:bg-white/5",
  danger: "bg-alert/15 text-alert border border-alert/30 hover:bg-alert/25",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex select-none items-center justify-center font-display transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${SIZES[size]} ${VARIANTS[variant]} ${className ?? ""}`}
        {...rest}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
