import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, CheckCircle2, AlertCircle, MapPin, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

type Job = {
  id: string;
  jobId: string;
  workshopId: string;
  customerId: string;
  vehicleDetails: string;
  serviceType: string;
  status: string;
  totalCost?: number;
  createdAt: string;
  estimatedCompletion?: string;
  workshop?: {
    name: string;
    city?: string;
    state?: string;
  };
};

export default function CustomerJobs() {
  const [, navigate] = useLocation();

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "in-progress":
        return <Clock className="w-4 h-4" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "in-progress":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "completed":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading jobs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-orbitron">My Service Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Track your vehicle service history
          </p>
        </div>
        <Button 
          onClick={() => navigate("/book-service")}
          data-testid="button-book-service"
        >
          <Plus className="w-4 h-4 mr-2" />
          Book Service
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle className="text-3xl font-mono">{jobs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-3xl font-mono text-blue-500">
              {jobs.filter(j => j.status === 'in-progress').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl font-mono text-green-500">
              {jobs.filter(j => j.status === 'completed').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl font-mono text-yellow-500">
              {jobs.filter(j => j.status === 'pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Service Jobs Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Book your first service to get started
            </p>
            <Button onClick={() => navigate("/book-service")} data-testid="button-book-first-service">
              <Plus className="w-4 h-4 mr-2" />
              Book a Service
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id} className="hover-elevate active-elevate-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg font-mono">
                        Job #{job.jobId}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(job.status)}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </Badge>
                    </div>
                    <CardDescription className="space-y-1">
                      <div className="font-semibold">{job.vehicleDetails}</div>
                      <div className="flex items-center gap-2 text-xs">
                        <Wrench className="w-3 h-3" />
                        {job.serviceType}
                      </div>
                      {job.workshop && (
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-3 h-3" />
                          {job.workshop.name}
                          {job.workshop.city && `, ${job.workshop.city}`}
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    {job.totalCost !== undefined && (
                      <div className="text-2xl font-bold font-mono text-primary">
                        RM {job.totalCost.toFixed(2)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/customer/jobs/${job.id}`)}
                    data-testid={`button-view-job-${job.id}`}
                  >
                    View Details
                  </Button>
                  {job.status === 'in-progress' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      data-testid={`button-track-job-${job.id}`}
                    >
                      Track Progress
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
