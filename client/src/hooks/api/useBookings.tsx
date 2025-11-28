import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Booking, InsertBooking, BookingStatus } from "@shared/schema";

// Customer: Get my bookings
export function useBookings() {
  return useQuery<Booking[]>({
    queryKey: ["/api/bookings/my"],
  });
}

// Customer: Create new booking (customerId set by backend from auth)
export function useCreateBooking() {
  return useMutation({
    mutationFn: async (booking: Omit<InsertBooking, "customerId">) => {
      return apiRequest("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(booking),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
    },
  });
}

// Workshop: Get all bookings with optional filters
export function useWorkshopBookings(
  workshopId: string | undefined,
  filters?: {
    status?: BookingStatus[];
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
) {
  return useQuery<Booking[]>({
    queryKey: ["/api/workshops", workshopId, "bookings", filters],
    queryFn: async () => {
      if (!workshopId) throw new Error("Workshop ID required");
      
      const params = new URLSearchParams();
      if (filters?.status) {
        filters.status.forEach(s => params.append('status', s));
      }
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.search) params.set('search', filters.search);
      
      const url = `/api/workshops/${workshopId}/bookings?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch bookings');
      return res.json();
    },
    enabled: !!workshopId,
  });
}

// Workshop: Update booking status
export function useUpdateBookingStatus() {
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      return apiRequest(`/api/bookings/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate all booking queries
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });
}

// Workshop: Update booking details (estimated cost, scheduled date, description)
export function useUpdateBooking() {
  return useMutation({
    mutationFn: async ({
      id,
      estimatedCost,
      scheduledDate,
      description,
    }: {
      id: string;
      estimatedCost?: string;
      scheduledDate?: string;
      description?: string;
    }) => {
      return apiRequest(`/api/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ estimatedCost, scheduledDate, description }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });
}

// Workshop: Approve booking and create work order
export function useApproveBooking() {
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest(`/api/workshop/bookings/${bookingId}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
    },
  });
}

// Workshop: Propose new date
export function useProposeBookingDate() {
  return useMutation({
    mutationFn: async ({ 
      id, 
      proposedDate, 
      proposalReason 
    }: { 
      id: string; 
      proposedDate: string; 
      proposalReason?: string; 
    }) => {
      return apiRequest(`/api/bookings/${id}/propose-date`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ proposedDate, proposalReason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshops"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });
}

// Customer: Accept proposed date
export function useAcceptBookingProposal() {
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest(`/api/bookings/${bookingId}/accept-proposal`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });
}

// Customer: Reject proposed date
export function useRejectBookingProposal() {
  return useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest(`/api/bookings/${bookingId}/reject-proposal`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
  });
}
