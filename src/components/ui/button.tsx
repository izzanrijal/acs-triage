import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full m3-label-large cursor-pointer transition-[background-color,box-shadow,color] duration-200 ease-m3-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:m3-elevation-1 hover:bg-primary/92",
        destructive: "bg-error text-on-error hover:m3-elevation-1 hover:bg-error/92",
        outline:
          "border border-outline bg-transparent text-primary hover:bg-primary/8 focus-visible:bg-primary/12",
        secondary:
          "bg-secondary-container text-on-secondary-container hover:m3-elevation-1 hover:bg-secondary-container/85",
        tonal:
          "bg-secondary-container text-on-secondary-container hover:m3-elevation-1 hover:bg-secondary-container/85",
        elevated:
          "bg-surface-container-low text-primary m3-elevation-1 hover:m3-elevation-2 hover:bg-primary/8",
        ghost: "text-primary hover:bg-primary/8",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
