import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Order, InsertOrder } from "@shared/schema";

export function useOrders(workshopId?: string | null) {
  return useQuery<Order[]>({
    queryKey: ['/api/orders', workshopId],
    enabled: workshopId !== undefined,
    select: (data) => workshopId ? data.filter(o => o.workshopId === workshopId) : data,
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (data: InsertOrder) => {
      return apiRequest<Order>('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deliveries'] });
    },
  });
}

export function useUpdateOrderStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest<Order>(`/api/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      // Invalidate all order queries including runner queries
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders', null] });
      queryClient.invalidateQueries({ queryKey: ['/api/deliveries'] });
    },
  });
}
