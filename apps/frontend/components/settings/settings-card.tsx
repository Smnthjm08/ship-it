import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SettingsCardProps {
  children: ReactNode;
  className?: string;
}

export function SettingsCard({ children, className }: SettingsCardProps) {
  return (
    <div
      className={cn(
        "border rounded-lg p-6 bg-card border-border hover:border-border/80 transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
}
