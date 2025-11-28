import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TowingRequest, InsertTowingRequest } from "@shared/schema";

// Fetch all towing requests for the current user (role-dependent filtering on backend)
export function useTowingRequests() {
  return useQuery<TowingRequest[]>({
    queryKey: ['/api/towing-requests'],
  });
}

// Create a new towing request
export function useCreateTowingRequest() {
  return useMutation({
    mutationFn: async (data: InsertTowingRequest) => {
      return apiRequest<TowingRequest>('/api/towing-requests', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/towing-requests'] });
    },
  });
}

// Assign a towing request to the current user (towing service)
export function useAssignTowingRequest() {
  return useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest<TowingRequest>(`/api/towing-requests/${requestId}/assign`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/towing-requests'] });
    },
  });
}

// Update towing request status
export function useUpdateTowingStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest<TowingRequest>(`/api/towing-requests/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/towing-requests'] });
    },
  });
}
