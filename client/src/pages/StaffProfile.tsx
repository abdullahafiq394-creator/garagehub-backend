import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  User, 
  Mail, 
  Briefcase, 
  DollarSign, 
  LogOut,
  Phone
} from "lucide-react";
import type { WorkshopStaff } from "@shared/schema";

export default function StaffProfile() {
  const { toast } = useToast();

  const { data: profile, isLoading } = useQuery<WorkshopStaff>({
    queryKey: ['/api/staff/me/profile'],
  });

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Force full page reload to /login (clears all state naturally)
        window.location.href = '/login';
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal Log Keluar",
        description: "Sila cuba lagi",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Profil Tidak Dijumpai</CardTitle>
            <CardDescription>
              Tidak dapat memuatkan profil anda. Sila hubungi pengurus bengkel.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-profile-title">Profil Saya</h1>
          <p className="text-muted-foreground">Maklumat peribadi dan akaun</p>
        </div>
        <User className="h-8 w-8 text-primary" />
      </div>

      {/* Profile Photo */}
      {profile.photoUrl && (
        <Card data-testid="card-profile-photo">
          <CardContent className="pt-6 flex justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage 
                src={profile.photoUrl} 
                alt={profile.name}
                data-testid="img-staff-photo"
              />
              <AvatarFallback className="text-4xl">
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>
      )}

      {/* Profile Information */}
      <Card data-testid="card-profile-info">
        <CardHeader>
          <CardTitle>Maklumat Peribadi</CardTitle>
          <CardDescription>Butiran profil staff anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Nama</p>
              <p className="font-medium" data-testid="text-profile-name">{profile.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Jawatan</p>
              <p className="font-medium" data-testid="text-profile-role">{profile.role}</p>
            </div>
          </div>

          {profile.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-sm break-all" data-testid="text-profile-email">{profile.email}</p>
              </div>
            </div>
          )}

          {profile.phone && (
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Telefon</p>
                <p className="font-medium" data-testid="text-profile-phone">{profile.phone}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Information */}
      <Card data-testid="card-salary-info">
        <CardHeader>
          <CardTitle>Maklumat Gaji</CardTitle>
          <CardDescription>Gaji asas dan kadar komisen</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Gaji Asas</p>
              <p className="font-medium font-mono" data-testid="text-basic-salary">
                RM {Number(profile.basicSalary || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Kadar Komisen</p>
              <p className="font-medium font-mono" data-testid="text-commission-rate">
                {Number(profile.commissionRate || 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logout Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLogout}
            data-testid="button-staff-logout"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Log Keluar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
