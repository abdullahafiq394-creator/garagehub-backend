import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Part, InsertPart } from "@shared/schema";

export function useParts(supplierId?: string | null) {
  return useQuery<Part[]>({
    queryKey: ['/api/parts', supplierId],
    enabled: supplierId !== undefined,
    select: (data) => supplierId ? data.filter(p => p.supplierId === supplierId) : data,
  });
}

export function useCreatePart() {
  return useMutation({
    mutationFn: async (data: InsertPart) => {
      return apiRequest<Part>('/api/parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
    },
  });
}

export function useUpdatePartStock() {
  return useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      return apiRequest<Part>(`/api/parts/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
    },
  });
}

export function useUpdatePart() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertPart> }) => {
      return apiRequest<Part>(`/api/parts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
    },
  });
}

export function useDeletePart() {
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/parts/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
    },
  });
}
