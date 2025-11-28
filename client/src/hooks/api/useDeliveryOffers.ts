import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DeliveryOffer } from "@shared/schema";

export function useDeliveryOffers(status?: string) {
  const queryKey = status 
    ? `/api/delivery-offers/runner?status=${status}`
    : '/api/delivery-offers/runner';
    
  return useQuery<DeliveryOffer[]>({
    queryKey: [queryKey, status],
    enabled: true,
  });
}

export function useAcceptOffer() {
  return useMutation({
    mutationFn: async (offerId: string) => {
      return await apiRequest<{ offer: DeliveryOffer; order: any }>(`/api/delivery-offers/${offerId}/accept`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-offers/runner'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
  });
}

export function useRejectOffer() {
  return useMutation({
    mutationFn: async (offerId: string) => {
      return await apiRequest<{ offer: DeliveryOffer }>(`/api/delivery-offers/${offerId}/reject`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-offers/runner'] });
    },
  });
}
