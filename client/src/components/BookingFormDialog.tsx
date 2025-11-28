import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCreateBooking } from "@/hooks/api/useBookings";
import { Calendar } from "lucide-react";
import type { Workshop } from "@shared/schema";

const bookingFormSchema = z.object({
  vehiclePlate: z.string().min(1, "Plate number required").max(50),
  vehicleModel: z.string().min(1, "Vehicle model required").max(255),
  serviceType: z.string().min(1, "Service type required"),
  description: z.string().optional(),
  preferredDate: z.string().min(1, "Preferred date required").refine((date) => {
    // Allow dates at least 5 minutes in the future to account for timezone/processing time
    const selectedDate = new Date(date);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    return selectedDate >= fiveMinutesFromNow;
  }, "Please select a date at least 5 minutes in the future"),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface BookingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workshop: Workshop;
}

const serviceTypeOptions = [
  "General Service",
  "Oil Change",
  "Brake Service",
  "Tire Replacement",
  "Engine Repair",
  "Transmission Repair",
  "Air Conditioning Service",
  "Battery Replacement",
  "Suspension Repair",
  "Electrical Repair",
  "Body Work",
  "Paint Work",
  "Other",
];

export function BookingFormDialog({ open, onOpenChange, workshop }: BookingFormDialogProps) {
  const { toast } = useToast();
  const createBookingMutation = useCreateBooking();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      vehiclePlate: "",
      vehicleModel: "",
      serviceType: "",
      description: "",
      preferredDate: "",
    },
  });

  const onSubmit = async (data: BookingFormData) => {
    try {
      // Backend injects customerId from authenticated user
      // Send ISO string for preferredDate to match schema expectations
      await createBookingMutation.mutateAsync({
        workshopId: workshop.id,
        vehiclePlate: data.vehiclePlate,
        vehicleModel: data.vehicleModel,
        serviceType: data.serviceType,
        description: data.description,
        preferredDate: new Date(data.preferredDate).toISOString(),
      });

      toast({
        title: "Booking Created!",
        description: `Your service booking with ${workshop.name} has been submitted. They will contact you soon.`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create booking. Please try again.";
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-booking-form">
        <DialogHeader>
          <DialogTitle>Book Service at {workshop.name}</DialogTitle>
          <DialogDescription>
            Fill in your vehicle details and service requirements
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Vehicle Plate */}
            <FormField
              control={form.control}
              name="vehiclePlate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Plate Number *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., ABC1234"
                      {...field}
                      data-testid="input-vehicle-plate"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Vehicle Model */}
            <FormField
              control={form.control}
              name="vehicleModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Model *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Perodua Myvi 2020"
                      {...field}
                      data-testid="input-vehicle-model"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Type */}
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder="Select service type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypeOptions.map((service) => (
                        <SelectItem key={service} value={service}>
                          {service}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preferred Date */}
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Date *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        type="datetime-local"
                        className="pl-10"
                        {...field}
                        data-testid="input-preferred-date"
                      />
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select a date at least 5 minutes from now
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe any specific issues or requirements..."
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBookingMutation.isPending}
                data-testid="button-submit-booking"
              >
                {createBookingMutation.isPending ? "Submitting..." : "Submit Booking"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
