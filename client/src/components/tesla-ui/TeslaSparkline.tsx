import { LineChart, Line, ResponsiveContainer } from "recharts";

interface TeslaSparklineProps {
  data: { value: number }[];
  color?: string;
}

export function TeslaSparkline({ data, color = "hsl(var(--primary))" }: TeslaSparklineProps) {
  return (
    <div className="h-12 w-full" data-testid="tesla-sparkline">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            dataKey="value" 
            dot={false} 
            type="monotone" 
            stroke={color}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
