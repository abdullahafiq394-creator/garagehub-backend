import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Clock, Star, ArrowLeft, Calendar } from "lucide-react";
import type { Workshop } from "@shared/schema";
import { useState } from "react";
import { BookingFormDialog } from "@/components/BookingFormDialog";

export default function WorkshopDetails() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: workshop, isLoading } = useQuery<Workshop>({
    queryKey: [`/api/workshops/${id}`],
  });

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="page-workshop-details-loading">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="flex flex-col items-center justify-center py-12" data-testid="page-workshop-not-found">
        <p className="text-lg text-muted-foreground mb-4">Workshop not found</p>
        <Button onClick={() => navigate("/book-service")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workshops
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-workshop-details">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/book-service")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">{workshop.name}</h1>
          <p className="text-muted-foreground mt-1">Workshop Details</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <span>{workshop.name}</span>
                  {workshop.isVerified && (
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                      Verified
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Address</p>
                  <p className="text-foreground">{workshop.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Phone</p>
                  <p className="text-foreground">{workshop.phone}</p>
                </div>
              </div>

              {workshop.description && (
                <div className="pt-4 border-t">
                  <p className="font-medium text-sm text-muted-foreground mb-2">About</p>
                  <p className="text-foreground">{workshop.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Services Offered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {[
                  "General Service",
                  "Engine Repair",
                  "Brake Service",
                  "Oil Change",
                  "Tire Service",
                  "Air Conditioning",
                  "Battery Replacement",
                  "Diagnostics"
                ].map((service) => (
                  <div
                    key={service}
                    className="flex items-center gap-2 p-2 rounded-md hover-elevate"
                  >
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm">{service}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Operating Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Monday - Friday</p>
                  <p className="text-xs text-muted-foreground">9:00 AM - 6:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Saturday</p>
                  <p className="text-xs text-muted-foreground">9:00 AM - 2:00 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Sunday</p>
                  <p className="text-xs text-muted-foreground">Closed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${
                        i < 4
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium">4.0</span>
                <span className="text-xs text-muted-foreground">(24 reviews)</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Based on customer feedback and service quality
              </p>
            </CardContent>
          </Card>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={() => setDialogOpen(true)}
            data-testid="button-book-service"
          >
            <Calendar className="h-5 w-5" />
            Book Service Now
          </Button>
        </div>
      </div>

      {/* Booking Dialog */}
      <BookingFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workshop={workshop}
      />
    </div>
  );
}
