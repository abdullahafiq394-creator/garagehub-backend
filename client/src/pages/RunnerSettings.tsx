import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Car, Shield, Languages } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RunnerSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    name: user?.email?.split('@')[0] || '',
    email: user?.email || '',
    phone: '',
  });

  // Vehicle settings
  const [vehicleData, setVehicleData] = useState({
    vehicleType: 'motorcycle',
    vehicleNumber: '',
    vehicleModel: '',
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    orderNotifications: true,
    paymentNotifications: true,
    marketingNotifications: false,
  });

  // Availability toggle
  const [isAvailable, setIsAvailable] = useState(true);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t("runner.settings.toasts.profileUpdated"),
        description: t("runner.settings.toasts.profileUpdatedDesc"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("runner.settings.toasts.updateFailed"),
        description: t("runner.settings.toasts.profileUpdateFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVehicleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Implement vehicle update API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t("runner.settings.toasts.vehicleUpdated"),
        description: t("runner.settings.toasts.vehicleUpdatedDesc"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("runner.settings.toasts.updateFailed"),
        description: t("runner.settings.toasts.vehicleUpdateFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setIsLoading(true);

    try {
      // TODO: Implement notification settings update API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t("runner.settings.toasts.notificationsUpdated"),
        description: t("runner.settings.toasts.notificationsUpdatedDesc"),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("runner.settings.toasts.updateFailed"),
        description: t("runner.settings.toasts.notificationUpdateFailed"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2 space-y-2">
      <div className="mb-1">
        <h1 className="text-xl font-bold" data-testid="text-page-title">{t("runner.settings.title")}</h1>
        <p className="text-foreground text-xs">{t("runner.settings.subtitle")}</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <CardTitle className="text-base">{t("runner.settings.profileInfo")}</CardTitle>
          </div>
          <CardDescription className="text-foreground text-xs">{t("runner.settings.profileInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("runner.settings.name")}</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                data-testid="input-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("runner.settings.email")}</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                disabled
                data-testid="input-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("runner.settings.phone")}</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                placeholder="+60 12-345 6789"
                data-testid="input-phone"
              />
            </div>
            <Button type="submit" disabled={isLoading} data-testid="button-save-profile">
              {isLoading ? t("runner.settings.saving") : t("runner.settings.saveProfile")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Vehicle Information */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <CardTitle className="text-base">{t("runner.settings.vehicleInfo")}</CardTitle>
          </div>
          <CardDescription className="text-foreground text-xs">{t("runner.settings.vehicleInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVehicleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleType">{t("runner.settings.vehicleType")}</Label>
              <Input
                id="vehicleType"
                value={vehicleData.vehicleType}
                onChange={(e) => setVehicleData({ ...vehicleData, vehicleType: e.target.value })}
                placeholder="e.g., Motorcycle, Car, Van"
                data-testid="input-vehicle-type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleNumber">{t("runner.settings.vehicleNumber")}</Label>
              <Input
                id="vehicleNumber"
                value={vehicleData.vehicleNumber}
                onChange={(e) => setVehicleData({ ...vehicleData, vehicleNumber: e.target.value })}
                placeholder="e.g., WXY 1234"
                data-testid="input-vehicle-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleModel">{t("runner.settings.vehicleModel")}</Label>
              <Input
                id="vehicleModel"
                value={vehicleData.vehicleModel}
                onChange={(e) => setVehicleData({ ...vehicleData, vehicleModel: e.target.value })}
                placeholder="e.g., Honda Wave 125"
                data-testid="input-vehicle-model"
              />
            </div>
            <Button type="submit" disabled={isLoading} data-testid="button-save-vehicle">
              {isLoading ? t("runner.settings.saving") : t("runner.settings.saveVehicle")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Availability Settings */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <CardTitle className="text-base">{t("runner.settings.availability")}</CardTitle>
          </div>
          <CardDescription className="text-foreground text-xs">{t("runner.settings.availabilityDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="availability">{t("runner.settings.availableForDeliveries")}</Label>
              <p className="text-xs text-foreground">
                {t("runner.settings.availabilityToggle")}
              </p>
            </div>
            <Switch
              id="availability"
              checked={isAvailable}
              onCheckedChange={setIsAvailable}
              data-testid="switch-availability"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <CardTitle className="text-base">{t("runner.settings.notificationPreferences")}</CardTitle>
          </div>
          <CardDescription className="text-foreground text-xs">{t("runner.settings.notificationPreferencesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="orderNotifications" className="text-sm">{t("runner.settings.orderNotifications")}</Label>
              <p className="text-xs text-foreground">
                {t("runner.settings.orderNotificationsDesc")}
              </p>
            </div>
            <Switch
              id="orderNotifications"
              checked={notificationSettings.orderNotifications}
              onCheckedChange={(checked) =>
                setNotificationSettings({ ...notificationSettings, orderNotifications: checked })
              }
              data-testid="switch-order-notifications"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="paymentNotifications" className="text-sm">{t("runner.settings.paymentNotifications")}</Label>
              <p className="text-xs text-foreground">
                {t("runner.settings.paymentNotificationsDesc")}
              </p>
            </div>
            <Switch
              id="paymentNotifications"
              checked={notificationSettings.paymentNotifications}
              onCheckedChange={(checked) =>
                setNotificationSettings({ ...notificationSettings, paymentNotifications: checked })
              }
              data-testid="switch-payment-notifications"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketingNotifications" className="text-sm">{t("runner.settings.marketingNotifications")}</Label>
              <p className="text-xs text-foreground">
                {t("runner.settings.marketingNotificationsDesc")}
              </p>
            </div>
            <Switch
              id="marketingNotifications"
              checked={notificationSettings.marketingNotifications}
              onCheckedChange={(checked) =>
                setNotificationSettings({ ...notificationSettings, marketingNotifications: checked })
              }
              data-testid="switch-marketing-notifications"
            />
          </div>

          <Button onClick={handleNotificationUpdate} disabled={isLoading} data-testid="button-save-notifications">
            {isLoading ? t("runner.settings.saving") : t("runner.settings.saveNotifications")}
          </Button>
        </CardContent>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            <CardTitle className="text-base">{t("runner.settings.languageSettings")}</CardTitle>
          </div>
          <CardDescription className="text-foreground text-xs">{t("runner.settings.languageSettingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="language">{t("runner.settings.selectLanguage")}</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as "ms" | "en")}>
              <SelectTrigger id="language" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ms">{t("runner.settings.malay")}</SelectItem>
                <SelectItem value="en">{t("runner.settings.english")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
