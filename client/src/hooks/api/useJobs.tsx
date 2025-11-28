import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Job, InsertJob } from "@shared/schema";

export function useJobs(workshopId?: string | null) {
  return useQuery<Job[]>({
    queryKey: ['/api/jobs'],
    select: (data) => workshopId ? data.filter(j => j.workshopId === workshopId) : data,
  });
}

export function useCreateJob() {
  return useMutation({
    mutationFn: async (data: InsertJob) => {
      return apiRequest<Job>('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
  });
}

export function useUpdateJobStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest<Job>(`/api/jobs/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    },
  });
}
