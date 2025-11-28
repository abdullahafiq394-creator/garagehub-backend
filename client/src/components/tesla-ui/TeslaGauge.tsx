interface TeslaGaugeProps {
  percent: number;
  showLabel?: boolean;
}

export function TeslaGauge({ percent, showLabel = true }: TeslaGaugeProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  
  return (
    <div className="space-y-2" data-testid="tesla-gauge">
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className="relative h-2 rounded-full glass">
        <div className="absolute inset-0 rounded-full bg-muted" />
        <div 
          className="relative h-2 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))"
          }}
        />
      </div>
    </div>
  );
}
