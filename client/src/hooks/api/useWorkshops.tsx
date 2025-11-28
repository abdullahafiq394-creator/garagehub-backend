import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Workshop, InsertWorkshop } from "@shared/schema";

export function useWorkshops() {
  return useQuery<Workshop[]>({
    queryKey: ['/api/workshops'],
  });
}

export function useCreateWorkshop() {
  return useMutation({
    mutationFn: async (data: InsertWorkshop) => {
      return apiRequest<Workshop>('/api/workshops', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshops'] });
    },
  });
}
