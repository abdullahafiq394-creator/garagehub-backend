import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/contexts/SocketContext";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, Circle, Clock, Wrench } from "lucide-react";
import { Link } from "wouter";

interface Job {
  id: string;
  jobId: string;
  workshopId: string;
  customerId: string | null;
  customerUserId: string | null;
  plateNo: string;
  vehicleModel: string;
  serviceType: string;
  description: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  estimatedCost: string | null;
  actualCost: string | null;
  taskList: Array<{ id: string; task: string; completed: boolean }> | null;
  startTime: string | null;
  endTime: string | null;
  workshopName: string | null;
  mechanicName: string | null;
  createdAt: string;
}

interface RealTimeJobProgressProps {
  customerId: string;
}

export default function RealTimeJobProgress({ customerId }: RealTimeJobProgressProps) {
  const { socket } = useSocket();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch customer's active jobs (server derives customerId from authenticated user)
  const { data: jobs, isLoading } = useQuery<Job[]>({
    queryKey: ['/api/customer/jobs'],
  });

  // Listen for real-time job progress updates
  useEffect(() => {
    if (!socket || !customerId) return;

    // Socket.io room joining handled server-side via authentication

    const handleJobUpdate = (data: { jobId: string; progress?: number; status?: string }) => {
      setLastUpdate(new Date());
      queryClient.invalidateQueries({ queryKey: ['/api/customer/jobs'] });
    };

    socket.on('job_update', handleJobUpdate);

    return () => {
      socket.off('job_update', handleJobUpdate);
    };
  }, [socket, customerId]);

  const activeJobs = jobs?.filter(j => j.status === 'in_progress' || j.status === 'pending') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Active Jobs</CardTitle>
          <CardDescription>Real-time progress tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (activeJobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Active Jobs</CardTitle>
          <CardDescription>Real-time progress tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No active jobs at the moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-real-time-jobs">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Active Jobs</CardTitle>
            <CardDescription>Real-time progress tracking</CardDescription>
          </div>
          {lastUpdate && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              Updated {lastUpdate.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activeJobs.map((job) => (
            <Link key={job.id} href={`/customer/jobs/${job.id}`}>
              <div
                className="p-4 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                data-testid={`job-card-${job.id}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold" data-testid={`job-id-${job.id}`}>{job.jobId}</p>
                        <Badge
                          variant={job.status === 'in_progress' ? 'default' : 'outline'}
                          data-testid={`job-status-${job.id}`}
                        >
                          {job.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {job.plateNo} - {job.vehicleModel}
                      </p>
                      {job.workshopName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Workshop: {job.workshopName}
                        </p>
                      )}
                      {job.mechanicName && (
                        <p className="text-xs text-muted-foreground">
                          Mechanic: {job.mechanicName}
                        </p>
                      )}
                      {job.description && <p className="text-sm mt-1">{job.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" data-testid={`job-progress-${job.id}`}>
                        {job.progress}%
                      </p>
                      <p className="text-xs text-muted-foreground">Complete</p>
                    </div>
                  </div>

                  <Progress value={job.progress} className="h-2" data-testid={`progress-bar-${job.id}`} />

                  {job.taskList && job.taskList.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Tasks:</p>
                      <div className="space-y-1">
                        {job.taskList.slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            {task.completed ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Circle className="h-3 w-3 text-muted-foreground" />
                            )}
                            <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                              {task.task}
                            </span>
                          </div>
                        ))}
                        {job.taskList.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-5">
                            +{job.taskList.length - 3} more tasks
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {(job.estimatedCost || job.actualCost) && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground">
                        {job.actualCost ? 'Total Cost:' : 'Estimated Cost:'}
                      </span>
                      <span className="font-medium">
                        RM {job.actualCost || job.estimatedCost}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
