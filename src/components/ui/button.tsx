import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] duration-150 h-10 px-4 py-2",
          variant === 'default' && "bg-blue-600 text-white hover:bg-blue-700 shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/30",
          variant === 'outline' && "border border-white/10 bg-slate-900/50 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-md",
          variant === 'ghost' && "bg-transparent hover:bg-white/5 text-slate-400 hover:text-white",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
