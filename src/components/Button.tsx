import { cn } from "$utils/tw";
import { type ClassValue } from "clsx";
import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant =
  | "unstyled"
  | "iconGhost"
  | "iconSubtle"
  | "outline"
  | "surface"
  | "secondary"
  | "primary"
  | "primaryBlue"
  | "link"
  | "dangerGhost";

export type ButtonSize = "none" | "xs" | "sm" | "md" | "lg" | "iconXs" | "iconSm" | "iconMd" | "iconLg";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, ClassValue> = {
  unstyled: "",
  iconGhost:
    "inline-flex items-center justify-center rounded bg-transparent border-none text-icon-secondary cursor-pointer",
  iconSubtle:
    "inline-flex items-center justify-center rounded border border-border-subtle bg-transparent text-icon-secondary hover:text-icon-primary cursor-pointer",
  outline:
    "inline-flex items-center justify-center rounded border border-border-subtle bg-transparent text-text-secondary hover:text-text-primary cursor-pointer",
  surface:
    "inline-flex items-center justify-center rounded border border-border-subtle bg-layer-01 text-text-secondary hover:text-text-primary cursor-pointer",
  secondary:
    "inline-flex items-center justify-center rounded border border-border-subtle bg-layer-02 text-text-primary hover:bg-layer-03 cursor-pointer",
  primary:
    "inline-flex items-center justify-center rounded border border-accent-cyan bg-accent-cyan text-white hover:opacity-90 cursor-pointer",
  primaryBlue:
    "inline-flex items-center justify-center rounded border border-accent-blue bg-accent-blue text-white hover:bg-link-hover cursor-pointer",
  link:
    "inline-flex items-center justify-center bg-transparent border-none text-link-primary underline underline-offset-2 cursor-pointer",
  dangerGhost: "inline-flex items-center justify-center bg-transparent border-none text-support-error cursor-pointer",
};

const BUTTON_SIZE_CLASSES: Record<ButtonSize, ClassValue> = {
  none: "",
  xs: "px-2 py-1 text-xs",
  sm: "px-2.5 py-1.5 text-[0.8125rem]",
  md: "px-3 py-1.5 text-sm",
  lg: "px-4 py-2 text-sm font-medium",
  iconXs: "w-4 h-4",
  iconSm: "w-5 h-5",
  iconMd: "w-6 h-6",
  iconLg: "w-7 h-7",
};

type TProps = { type?: "button" | "submit" | "reset"; variant?: ButtonVariant; size?: ButtonSize };
export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & TProps;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((
  { type = "button", variant = "unstyled", size = "none", className, ...props },
  ref,
) => (
  <button
    ref={ref}
    type={type}
    className={cn(
      "disabled:cursor-not-allowed disabled:opacity-50",
      BUTTON_VARIANT_CLASSES[variant],
      BUTTON_SIZE_CLASSES[size],
      className,
    )}
    {...props} />
));

Button.displayName = "Button";
