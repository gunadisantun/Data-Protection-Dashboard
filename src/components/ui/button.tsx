import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,var(--pv-blue),var(--pv-cyan))] text-white shadow-[0_8px_20px_rgba(0,122,255,0.22)] hover:-translate-y-0.5 hover:brightness-105 focus-visible:outline-blue-600 active:translate-y-0",
        secondary:
          "border border-[color:var(--pv-border)] bg-white/75 text-slate-900 shadow-sm backdrop-blur hover:bg-white",
        dark: "bg-[color:var(--pv-navy)] text-white shadow-sm hover:bg-[color:var(--pv-navy-soft)]",
        ghost: "text-slate-600 hover:bg-white/70 hover:text-slate-950",
        danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        warning:
          "bg-[linear-gradient(135deg,var(--pv-purple),var(--pv-coral))] text-white shadow-[0_8px_20px_rgba(175,82,222,0.18)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-10 px-4",
        lg: "h-12 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
