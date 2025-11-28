import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSocket } from "@/contexts/SocketContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface Job {
  id: string;
  jobId: string;
  workshopId: string;
  customerId: string;
  vehicleInfo: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  taskList: Array<{ id: string; task: string; completed: boolean }> | null;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export default function CustomerJobView() {
  const [, params] = useRoute("/customer/jobs/:id");
  const jobId = params?.id;
  const { socket } = useSocket();
  const { toast } = useToast();

  // Fetch job details (read-only customer view)
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['/api/customer/jobs', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const res = await fetch(`/api/customer/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      return res.json();
    },
  });

  // Listen for real-time progress updates
  useEffect(() => {
    if (!socket || !jobId) return;

    const handleJobUpdate = (data: { jobId: string; progress?: number }) => {
      if (data.jobId === jobId) {
        queryClient.invalidateQueries({ queryKey: ['/api/customer/jobs', jobId] });
        if (data.progress !== undefined) {
          toast({
            title: "Job Updated",
            description: `Progress updated to ${data.progress}%`,
          });
        }
      }
    };

    socket.on('job_update', handleJobUpdate);

    return () => {
      socket.off('job_update', handleJobUpdate);
    };
  }, [socket, jobId, toast]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="text-center py-12">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Job Not Found</CardTitle>
            <CardDescription>The requested job could not be found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold" data-testid="heading-job-view">Your Service Job</h1>
        <p className="text-muted-foreground">Job ID: {job.jobId}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Information */}
        <Card data-testid="card-job-info">
          <CardHeader>
            <CardTitle>Service Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Vehicle</p>
              <p className="font-medium" data-testid="text-vehicle-info">{job.vehicleInfo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Description</p>
              <p className="text-sm" data-testid="text-job-description">{job.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    job.status === 'completed'
                      ? 'default'
                      : job.status === 'in_progress'
                      ? 'secondary'
                      : 'outline'
                  }
                  data-testid="badge-job-status"
                >
                  {job.status === 'completed' ? 'Completed' : job.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="font-medium" data-testid="text-total-cost">
                  RM {formatCurrency(job.totalCost)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Started</p>
              <p className="text-sm">
                {format(new Date(job.createdAt), 'PPp')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress Tracking */}
        <Card data-testid="card-progress">
          <CardHeader>
            <CardTitle>Service Progress</CardTitle>
            <CardDescription>Real-time updates on your service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">Completion Status</p>
                <span className="text-2xl font-bold" data-testid="text-progress-percentage">
                  {job.progress}%
                </span>
              </div>
              <Progress value={job.progress} className="h-4" data-testid="progress-bar" />
            </div>

            {job.status === 'in_progress' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>Your vehicle is currently being serviced</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task List (Read-Only) */}
        {job.taskList && job.taskList.length > 0 && (
          <Card data-testid="card-task-list">
            <CardHeader>
              <CardTitle>Service Tasks</CardTitle>
              <CardDescription>Work being performed on your vehicle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {job.taskList.map((task) => (
                  <div key={task.id} className="flex items-center gap-2" data-testid={`task-${task.id}`}>
                    {task.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={task.completed ? 'line-through text-muted-foreground text-sm' : 'text-sm'}>
                      {task.task}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
