import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car } from "lucide-react";

interface BayStatusTabProps {
  workshopId: string;
}

export default function BayStatusTab({ workshopId }: BayStatusTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5" />
          <CardTitle>Real-Time Bay Status</CardTitle>
        </div>
        <CardDescription>
          Monitor service bay availability and assignments in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Real-Time Bay Status UI - Coming Soon (Workshop ID: {workshopId.slice(0, 8)})
        </div>
      </CardContent>
    </Card>
  );
}
