interface TeslaStatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
}

export function TeslaStatsCard({ title, value, icon }: TeslaStatsCardProps) {
  return (
    <div className="card-glow rounded-xl p-5 flex flex-col justify-center text-center text-gray-50" data-testid="tesla-stats-card">
      <div className="flex items-center justify-center gap-2 mb-1">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="text-lg font-medium glow-text">{title}</h2>
      </div>
      <p className="text-2xl font-bold text-white drop-shadow-md glow-text">{value}</p>
    </div>
  );
}
