import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

const StatCard = ({ title, value, icon, trend, variant = "default" }: StatCardProps) => {
  const variantStyles = {
    default: "border-border",
    success: "border-primary/30 bg-primary/5",
    warning: "border-warning/30 bg-warning/5",
    danger: "border-destructive/30 bg-destructive/5",
  };

  return (
    <div className={cn(
      "glass rounded-xl p-6 transition-all duration-300 hover:shadow-card",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-sm font-medium",
            trend.isPositive ? "text-primary" : "text-destructive"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
};

export default StatCard;
