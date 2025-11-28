import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSocket } from "@/contexts/SocketContext";
import { Loader2, Download, CheckCircle, Circle, Clock } from "lucide-react";
import { format } from "date-fns";
import type { WorkshopJob } from "@shared/schema";

// Type guard for task list
type Task = { id: string; task: string; completed: boolean };
function isTaskArray(value: unknown): value is Task[] {
  return Array.isArray(value) && value.every(
    (item) => 
      typeof item === 'object' && 
      item !== null && 
      'id' in item && 
      'task' in item && 
      'completed' in item
  );
}

export default function JobDetail() {
  const [, params] = useRoute("/jobs/:id");
  const jobId = params?.id;
  const { toast} = useToast();
  const { socket } = useSocket();
  const [newTask, setNewTask] = useState("");

  // Fetch job details
  const { data: job, isLoading } = useQuery<WorkshopJob>({
    queryKey: ['/api/workshop/jobs', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const res = await fetch(`/api/workshop/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      return res.json();
    },
  });

  // Listen for real-time progress updates
  useEffect(() => {
    if (!socket || !jobId) return;

    const handleJobUpdate = (data: { jobId: string; progress?: number; taskList?: any[] }) => {
      if (data.jobId === jobId) {
        queryClient.invalidateQueries({ queryKey: ['/api/workshop/jobs', jobId] });
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

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (progress: number) => {
      const safeTaskList = isTaskArray(job?.taskList) ? job.taskList : [];
      const res = await apiRequest('PATCH', `/api/workshop/jobs/${jobId}/progress`, {
        progress,
        taskList: safeTaskList,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Progress Updated",
        description: "Job progress has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workshop/jobs', jobId] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update progress.",
      });
    },
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task: string) => {
      const safeTaskList = isTaskArray(job?.taskList) ? job.taskList : [];
      const newTaskList: Task[] = [
        ...safeTaskList,
        { id: Date.now().toString(), task, completed: false },
      ];
      const res = await apiRequest('PATCH', `/api/workshop/jobs/${jobId}/progress`, {
        progress: job?.progress || 0,
        taskList: newTaskList,
      });
      return res.json();
    },
    onSuccess: () => {
      setNewTask("");
      queryClient.invalidateQueries({ queryKey: ['/api/workshop/jobs', jobId] });
    },
  });

  // Toggle task mutation
  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const safeTaskList = isTaskArray(job?.taskList) ? job.taskList : [];
      const updatedTaskList: Task[] = safeTaskList.map(t =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      );
      const completedCount = updatedTaskList.filter(t => t.completed).length;
      const newProgress = updatedTaskList.length > 0
        ? Math.round((completedCount / updatedTaskList.length) * 100)
        : 0;

      const res = await apiRequest('PATCH', `/api/workshop/jobs/${jobId}/progress`, {
        progress: newProgress,
        taskList: updatedTaskList,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop/jobs', jobId] });
    },
  });


  const handleDownloadReceipt = async () => {
    try {
      const res = await fetch(`/api/workshop/jobs/${jobId}/receipt`);
      if (!res.ok) throw new Error('Failed to generate receipt');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${job?.jobId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Receipt Downloaded",
        description: "PDF receipt has been generated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Failed to generate receipt.",
      });
    }
  };

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-job-detail">Job Details</h1>
          <p className="text-muted-foreground">Job ID: {job.jobId}</p>
        </div>
        <Button onClick={handleDownloadReceipt} data-testid="button-download-receipt">
          <Download className="mr-2 h-4 w-4" />
          Download Receipt
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Information */}
        <Card data-testid="card-job-info">
          <CardHeader>
            <CardTitle>Job Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Vehicle</Label>
              <p className="font-medium" data-testid="text-vehicle-info">
                {job.vehicleModel} • {job.plateNo}
              </p>
            </div>
            <div>
              <Label>Description</Label>
              <p className="text-sm" data-testid="text-job-description">{job.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
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
                  {job.status}
                </Badge>
              </div>
              <div>
                <Label>{job.status === 'completed' ? 'Actual Cost' : 'Estimated Cost'}</Label>
                <p className="font-medium" data-testid="text-total-cost">
                  RM {job.status === 'completed' && job.actualCost 
                    ? Number(job.actualCost).toFixed(2) 
                    : job.estimatedCost 
                    ? Number(job.estimatedCost).toFixed(2) 
                    : '0.00'}
                </p>
              </div>
            </div>
            <div>
              <Label>Created</Label>
              <p className="text-sm text-muted-foreground">
                {job.createdAt ? format(new Date(job.createdAt), 'PPp') : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Progress Tracking */}
        <Card data-testid="card-progress">
          <CardHeader>
            <CardTitle>Progress Tracking</CardTitle>
            <CardDescription>Current job completion status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Overall Progress</Label>
                <span className="text-2xl font-bold" data-testid="text-progress-percentage">
                  {job.progress}%
                </span>
              </div>
              <Progress value={job.progress} className="h-4" data-testid="progress-bar" />
            </div>

            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="Update progress %"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    const value = parseInt(input.value);
                    if (value >= 0 && value <= 100) {
                      updateProgressMutation.mutate(value);
                      input.value = '';
                    }
                  }
                }}
                data-testid="input-progress"
              />
              <Button
                onClick={() => {
                  const input = document.querySelector('[data-testid="input-progress"]') as HTMLInputElement;
                  const value = parseInt(input.value);
                  if (value >= 0 && value <= 100) {
                    updateProgressMutation.mutate(value);
                    input.value = '';
                  }
                }}
                disabled={updateProgressMutation.isPending}
                data-testid="button-update-progress"
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task List */}
        <Card data-testid="card-task-list">
          <CardHeader>
            <CardTitle>Task Checklist</CardTitle>
            <CardDescription>Track individual job tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {job.taskList && job.taskList.length > 0 ? (
                job.taskList.map((task) => (
                  <div key={task.id} className="flex items-center gap-2" data-testid={`task-${task.id}`}>
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTaskMutation.mutate(task.id)}
                      data-testid={`checkbox-task-${task.id}`}
                    />
                    <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                      {task.task}
                    </span>
                    {task.completed && <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No tasks yet. Add tasks to track progress.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Add new task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newTask.trim()) {
                    addTaskMutation.mutate(newTask);
                  }
                }}
                data-testid="input-new-task"
              />
              <Button
                onClick={() => newTask.trim() && addTaskMutation.mutate(newTask)}
                disabled={!newTask.trim() || addTaskMutation.isPending}
                data-testid="button-add-task"
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
