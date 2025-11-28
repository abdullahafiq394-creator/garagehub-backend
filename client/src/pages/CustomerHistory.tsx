import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Package, Wrench, Calendar } from "lucide-react";

interface Job {
  id: string;
  workshopId: string;
  workshopName: string;
  vehiclePlate: string;
  vehicleModel: string;
  description: string;
  status: string;
  totalCost: number;
  createdAt: string;
}

interface Booking {
  id: string;
  workshopId: string;
  workshopName: string;
  vehicleModel: string;
  vehiclePlate: string;
  serviceType: string;
  preferredDate: string;
  status: string;
  createdAt: string;
}

export default function CustomerHistory() {
  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["/api/customer/jobs"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/my"],
  });

  const allHistory = [
    ...jobs.map(j => ({ ...j, type: 'job' as const })),
    ...bookings.map(b => ({ ...b, type: 'booking' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'approved': return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'cancelled': return 'bg-red-500/10 text-red-600 dark:text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6" data-testid="page-customer-history">
      <div>
        <h1 className="text-3xl font-bold text-foreground">History</h1>
        <p className="text-muted-foreground mt-1">
          Your complete service and booking history
        </p>
      </div>

      <div className="grid gap-4">
        {allHistory.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No history yet</p>
              <p className="text-sm text-muted-foreground">
                Your jobs and bookings will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          allHistory.map((item) => (
            <Card key={`${item.type}-${item.id}`} data-testid={`history-${item.type}-${item.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {item.type === 'job' ? (
                      <Wrench className="h-5 w-5 text-primary" />
                    ) : (
                      <Calendar className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <CardTitle className="text-base">
                        {item.type === 'job' ? 'Service Job' : 'Booking'}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {'workshopName' in item && item.workshopName}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle:</span>
                    <span className="font-medium">
                      {item.vehicleModel} • {item.vehiclePlate}
                    </span>
                  </div>
                  {item.type === 'booking' && 'serviceType' in item && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service:</span>
                      <span className="font-medium">{item.serviceType}</span>
                    </div>
                  )}
                  {item.type === 'job' && 'totalCost' in item && item.totalCost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">RM {item.totalCost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">
                      {format(new Date(item.createdAt), 'dd MMM yyyy')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
