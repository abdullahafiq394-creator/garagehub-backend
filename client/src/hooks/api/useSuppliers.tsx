import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Supplier, InsertSupplier } from "@shared/schema";

export function useSuppliers() {
  return useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });
}

export function useCreateSupplier() {
  return useMutation({
    mutationFn: async (data: InsertSupplier) => {
      return apiRequest<Supplier>('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    },
  });
}
