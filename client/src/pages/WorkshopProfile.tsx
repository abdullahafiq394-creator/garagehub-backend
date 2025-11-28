import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, MapPin, Phone, Building, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkshops } from "@/hooks/api/useWorkshops";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

export default function WorkshopProfile() {
  const { user } = useAuth();
  const { data: workshops, isLoading } = useWorkshops();
  const workshop = workshops?.find(w => w.userId === user?.id);
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <Card className="card-glow">
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card className="card-glow" data-testid="card-workshop-profile">
          <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0 pb-4">
            <div className="w-full flex flex-col items-center gap-3">
              <Building className="h-8 w-8" />
              <div className="text-center">
                <CardTitle className="glow-text text-foreground">Workshop Profile</CardTitle>
                <p className="text-sm text-muted-foreground mt-2">Manage your workshop information</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/workshop/settings')}
              data-testid="button-edit-profile"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Account Information</h3>
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">
                      {user?.firstName || user?.lastName 
                        ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workshop Info */}
            {workshop && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground">Workshop Information</h3>
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Workshop Name</p>
                      <p className="font-medium text-foreground">{workshop.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium text-foreground">
                        {workshop.city}, {workshop.state}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-medium text-foreground">{workshop.phone || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${workshop.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium text-foreground">
                        {workshop.isVerified ? "Verified" : "Pending Verification"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
