import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  icon: ReactNode;
  accent?: "primary" | "accent" | "success" | "warning";
}

const accentMap = {
  primary: "from-primary/20 to-primary-glow/10 text-primary",
  accent: "from-accent/20 to-accent-glow/10 text-accent",
  success: "from-success/20 to-success/5 text-success",
  warning: "from-warning/20 to-warning/5 text-warning",
};

export function StatCard({ label, value, delta, icon, accent = "primary" }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-5 hover:shadow-neon transition-all duration-300 group animate-in-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-mono">{label}</p>
          <p className="font-display text-3xl font-bold mt-2">{value}</p>
          {delta && <p className="text-xs text-muted-foreground mt-1">{delta}</p>}
        </div>
        <div className={cn(
          "h-11 w-11 rounded-xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform",
          accentMap[accent]
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}
