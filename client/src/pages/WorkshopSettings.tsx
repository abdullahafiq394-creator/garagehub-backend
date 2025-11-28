import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Loader2, 
  Settings as SettingsIcon, 
  Building2, 
  DollarSign, 
  Clock, 
  Bell, 
  Shield 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Workshop {
  id: string;
  name: string;
  description: string | null;
  address: string;
  phone: string;
  state: string;
  city: string;
}

interface WorkshopSettings {
  id: string;
  workshopId: string;
  zakatRate: number;
  taxRate: number;
  geofenceRadius: number;
  lateThresholdTime: string;
  verificationMethod: 'geofence' | 'face' | 'geofence+face';
}

// General Settings Schema
const generalSettingsSchema = z.object({
  name: z.string().min(3, "Workshop name must be at least 3 characters"),
  description: z.string().optional(),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(10, "Address must be at least 10 characters"),
  city: z.string().min(2, "City name is required"),
  state: z.string().min(2, "State is required"),
});

// Financial Settings Schema
const financialSettingsSchema = z.object({
  zakatRate: z.coerce.number().min(0).max(100),
  taxRate: z.coerce.number().min(0).max(100),
});

// Attendance Settings Schema
const attendanceSettingsSchema = z.object({
  geofenceRadius: z.coerce.number().min(10).max(1000),
  lateThresholdTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  verificationMethod: z.enum(['geofence', 'face', 'geofence+face']),
});

// Notification Settings Schema
const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  orderNotifications: z.boolean(),
  jobNotifications: z.boolean(),
  staffNotifications: z.boolean(),
  paymentNotifications: z.boolean(),
});

// Security Settings Schema
const securitySettingsSchema = z.object({
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional(),
  confirmPassword: z.string().min(6).optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords must match and current password is required",
  path: ["confirmPassword"],
});

export default function WorkshopSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: workshop, isLoading: isLoadingWorkshop } = useQuery<Workshop>({
    queryKey: ['/api/workshops/mine'],
    enabled: user?.role === 'workshop',
  });

  const { data: settings, isLoading: isLoadingSettings } = useQuery<WorkshopSettings>({
    queryKey: ['/api/workshop/settings', workshop?.id],
    enabled: !!workshop?.id,
    queryFn: async () => {
      const res = await fetch(`/api/workshop/settings/${workshop!.id}`);
      if (!res.ok) {
        if (res.status === 404) {
          return null;
        }
        throw new Error('Failed to fetch settings');
      }
      return res.json();
    },
  });

  // General Settings Form
  const generalForm = useForm({
    resolver: zodResolver(generalSettingsSchema),
    values: workshop ? {
      name: workshop.name,
      description: workshop.description || "",
      phone: workshop.phone,
      address: workshop.address,
      city: workshop.city,
      state: workshop.state,
    } : undefined,
  });

  // Financial Settings Form
  const financialForm = useForm({
    resolver: zodResolver(financialSettingsSchema),
    values: settings ? {
      zakatRate: settings.zakatRate,
      taxRate: settings.taxRate,
    } : {
      zakatRate: 2.5,
      taxRate: 10,
    },
  });

  // Attendance Settings Form
  const attendanceForm = useForm({
    resolver: zodResolver(attendanceSettingsSchema),
    values: settings ? {
      geofenceRadius: settings.geofenceRadius,
      lateThresholdTime: settings.lateThresholdTime,
      verificationMethod: settings.verificationMethod,
    } : {
      geofenceRadius: 100,
      lateThresholdTime: '09:00',
      verificationMethod: 'geofence' as const,
    },
  });

  // Notification Settings Form
  const notificationForm = useForm({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      orderNotifications: true,
      jobNotifications: true,
      staffNotifications: true,
      paymentNotifications: true,
    },
  });

  // Security Settings Form
  const securityForm = useForm({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update General Settings Mutation
  const updateGeneralMutation = useMutation({
    mutationFn: async (data: z.infer<typeof generalSettingsSchema>) => {
      // If workshop exists, update it. Otherwise, create it.
      const method = workshop ? 'PUT' : 'POST';
      const endpoint = workshop ? `/api/workshops/${workshop.id}` : '/api/workshops';
      const res = await apiRequest(method, endpoint, data);
      return res.json();
    },
    onSuccess: async () => {
      toast({
        title: "Settings Updated",
        description: "General settings have been saved successfully.",
      });
      // Invalidate and refetch workshop data to ensure subsequent saves use PUT
      await queryClient.invalidateQueries({ queryKey: ['/api/workshops/mine'] });
      await queryClient.refetchQueries({ queryKey: ['/api/workshops/mine'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update settings.",
      });
    },
  });

  // Update Financial/Attendance Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = settings
        ? `/api/workshop/settings/${workshop!.id}`
        : '/api/workshop/settings';
      const method = settings ? 'PUT' : 'POST';
      const res = await apiRequest(method, endpoint, {
        workshopId: workshop!.id,
        ...data,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workshop/settings', workshop?.id] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update settings.",
      });
    },
  });

  // Update Notification Settings (localStorage for now)
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationSettingsSchema>) => {
      localStorage.setItem('notificationSettings', JSON.stringify(data));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Notifications Updated",
        description: "Notification preferences have been saved.",
      });
    },
  });

  // Update Security Settings
  const updateSecurityMutation = useMutation({
    mutationFn: async (data: z.infer<typeof securitySettingsSchema>) => {
      // Only send password update if new password provided
      if (data.newPassword) {
        const res = await apiRequest('PUT', '/api/auth/password', {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        });
        return res.json();
      }
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Security Updated",
        description: "Security settings have been updated.",
      });
      securityForm.reset();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Failed to update security settings.",
      });
    },
  });

  if (user?.role !== 'workshop') {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Only workshop owners can access settings.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoadingWorkshop || isLoadingSettings) {
    return (
      <div className="container mx-auto p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const malaysianStates = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
    'Pahang', 'Penang', 'Perak', 'Perlis', 'Sabah',
    'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
  ];

  return (
    <div className="container mx-auto px-4 py-4 pb-20">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Workshop Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="general" data-testid="tab-general" className="text-xs px-2 py-2">
            General
          </TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial" className="text-xs px-2 py-2">
            Financial
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance" className="text-xs px-2 py-2">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications" className="text-xs px-1 py-2">
            Notify
          </TabsTrigger>
          <TabsTrigger value="security" data-testid="tab-security" className="text-xs px-2 py-2">
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Manage your workshop basic information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...generalForm}>
                <form onSubmit={generalForm.handleSubmit((data) => updateGeneralMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={generalForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workshop Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Auto Workshop" {...field} data-testid="input-workshop-name" />
                        </FormControl>
                        <FormDescription>Your official workshop business name</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="We specialize in car servicing and repairs..."
                            {...field}
                            data-testid="input-workshop-description"
                          />
                        </FormControl>
                        <FormDescription>Brief description of your workshop services</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="012-3456789" {...field} data-testid="input-workshop-phone" />
                        </FormControl>
                        <FormDescription>Main contact number for customers</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={generalForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="No. 123, Jalan Example, Taman ABC"
                            {...field}
                            data-testid="input-workshop-address"
                          />
                        </FormControl>
                        <FormDescription>Full workshop address</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={generalForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="Kuala Lumpur" {...field} data-testid="input-workshop-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-workshop-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {malaysianStates.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={updateGeneralMutation.isPending}
                    data-testid="button-save-general"
                  >
                    {updateGeneralMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Save General Settings
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Settings Tab */}
        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Settings</CardTitle>
              <CardDescription>Configure Zakat and Tax calculation rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...financialForm}>
                <form onSubmit={financialForm.handleSubmit((data) => updateSettingsMutation.mutate({
                  zakatRate: data.zakatRate,
                  taxRate: data.taxRate,
                  geofenceRadius: settings?.geofenceRadius ?? 100,
                  lateThresholdTime: settings?.lateThresholdTime ?? '09:00',
                  verificationMethod: settings?.verificationMethod ?? 'geofence',
                }))} className="space-y-4">
                  <FormField
                    control={financialForm.control}
                    name="zakatRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zakat Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="2.5"
                            {...field}
                            data-testid="input-zakat-rate"
                          />
                        </FormControl>
                        <FormDescription>
                          Islamic charitable contribution rate (default: 2.5%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={financialForm.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Rate (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="10"
                            {...field}
                            data-testid="input-tax-rate"
                          />
                        </FormControl>
                        <FormDescription>
                          Government tax rate (default: 10%)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-financial"
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Save Financial Settings
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Settings Tab */}
        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Settings</CardTitle>
              <CardDescription>Configure staff attendance verification and geofencing</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...attendanceForm}>
                <form onSubmit={attendanceForm.handleSubmit((data) => updateSettingsMutation.mutate({
                  zakatRate: settings?.zakatRate ?? 2.5,
                  taxRate: settings?.taxRate ?? 10,
                  geofenceRadius: data.geofenceRadius,
                  lateThresholdTime: data.lateThresholdTime,
                  verificationMethod: data.verificationMethod,
                }))} className="space-y-4">
                  <FormField
                    control={attendanceForm.control}
                    name="geofenceRadius"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geofence Radius (meters)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            data-testid="input-geofence-radius"
                          />
                        </FormControl>
                        <FormDescription>
                          Staff must be within this distance to clock in (default: 100m)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={attendanceForm.control}
                    name="lateThresholdTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Threshold Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            placeholder="09:00"
                            {...field}
                            data-testid="input-late-threshold"
                          />
                        </FormControl>
                        <FormDescription>
                          Clock-ins after this time are marked as late (format: HH:MM)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={attendanceForm.control}
                    name="verificationMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-verification-method">
                              <SelectValue placeholder="Select verification method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="geofence">Geofence Only</SelectItem>
                            <SelectItem value="face">Face Recognition Only</SelectItem>
                            <SelectItem value="geofence+face">Geofence + Face Recognition</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose the required verification method for staff attendance
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={updateSettingsMutation.isPending}
                    data-testid="button-save-attendance"
                  >
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-4 w-4" />
                        Save Attendance Settings
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit((data) => updateNotificationsMutation.mutate(data))} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Notification Channels</h3>
                      
                      <FormField
                        control={notificationForm.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Email Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-email-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="smsNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">SMS Notifications</FormLabel>
                              <FormDescription>
                                Receive notifications via SMS
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-sms-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Event Types</h3>
                      
                      <FormField
                        control={notificationForm.control}
                        name="orderNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Order Updates</FormLabel>
                              <FormDescription>
                                New orders, deliveries, and status changes
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-order-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="jobNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Job Updates</FormLabel>
                              <FormDescription>
                                Job assignments, progress, and completions
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-job-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="staffNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Staff Activities</FormLabel>
                              <FormDescription>
                                Attendance, leave requests, and performance
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-staff-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="paymentNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Payment Updates</FormLabel>
                              <FormDescription>
                                Wallet transactions and payment confirmations
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-payment-notifications"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={updateNotificationsMutation.isPending}
                    data-testid="button-save-notifications"
                  >
                    {updateNotificationsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" />
                        Save Notification Preferences
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit((data) => updateSecurityMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={securityForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter current password"
                              {...field}
                              data-testid="input-current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter new password"
                              {...field}
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormDescription>
                            Must be at least 6 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm new password"
                              {...field}
                              data-testid="input-confirm-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={updateSecurityMutation.isPending}
                      data-testid="button-change-password"
                    >
                      {updateSecurityMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
