import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TowerControl } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTowingRequestSchema } from "@shared/schema";
import type { InsertTowingRequest } from "@shared/schema";
import { useCreateTowingRequest } from "@/hooks/api/useTowing";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function Towing() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateTowingRequest();

  const form = useForm<InsertTowingRequest>({
    resolver: zodResolver(insertTowingRequestSchema),
    defaultValues: {
      customerId: user?.id || '',
      vehicleModel: '',
      vehiclePlate: '',
      pickupLocation: '',
      dropoffLocation: '',
      notes: '',
    },
  });

  const onSubmit = async (data: InsertTowingRequest) => {
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: "Towing Request Submitted",
        description: "A towing service will be assigned to your request shortly.",
      });
      form.reset();
      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit towing request. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Request Towing Service</h1>
        <p className="text-muted-foreground mt-2">
          Get immediate assistance with vehicle towing
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
                <TowerControl className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Towing Request Form</CardTitle>
                <CardDescription>Fill in the details below to request towing assistance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vehicle-model">Vehicle Model</Label>
                <Input
                  id="vehicle-model"
                  placeholder="e.g., Toyota Camry"
                  data-testid="input-vehicle-model"
                  {...form.register('vehicleModel')}
                />
                {form.formState.errors.vehicleModel && (
                  <p className="text-sm text-destructive">{form.formState.errors.vehicleModel.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicle-plate">License Plate</Label>
                <Input
                  id="vehicle-plate"
                  placeholder="e.g., ABC 1234"
                  data-testid="input-vehicle-plate"
                  {...form.register('vehiclePlate')}
                />
                {form.formState.errors.vehiclePlate && (
                  <p className="text-sm text-destructive">{form.formState.errors.vehiclePlate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pickup-location">Pickup Location</Label>
              <Input
                id="pickup-location"
                placeholder="Enter current vehicle location"
                data-testid="input-pickup-location"
                {...form.register('pickupLocation')}
              />
              {form.formState.errors.pickupLocation && (
                <p className="text-sm text-destructive">{form.formState.errors.pickupLocation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dropoff-location">Dropoff Location</Label>
              <Input
                id="dropoff-location"
                placeholder="Enter destination (workshop or home)"
                data-testid="input-dropoff-location"
                {...form.register('dropoffLocation')}
              />
              {form.formState.errors.dropoffLocation && (
                <p className="text-sm text-destructive">{form.formState.errors.dropoffLocation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or details..."
                rows={4}
                data-testid="input-notes"
                {...form.register('notes')}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1" 
                size="lg" 
                data-testid="button-submit-request"
                disabled={createMutation.isPending}
              >
                <TowerControl className="h-4 w-4 mr-2" />
                {createMutation.isPending ? "Submitting..." : "Request Towing Service"}
              </Button>
              <Button 
                type="button"
                variant="outline" 
                size="lg" 
                data-testid="button-cancel"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>What to Expect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• A towing service provider will be assigned to your request</p>
          <p>• You'll receive an estimated cost and arrival time</p>
          <p>• Track your towing service in real-time</p>
          <p>• Payment will be processed after service completion</p>
        </CardContent>
      </Card>
    </div>
  );
}
