import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, 
  Clock, 
  Calendar, 
  DollarSign, 
  FileText, 
  LogIn, 
  LogOut,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wrench,
  Package,
  Plus,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { useRef, useEffect } from "react";
import type { WorkshopStaff, StaffAttendance, StaffCommission, WorkshopJob, JobPartsRequest, JobPartRequestItem } from "@shared/schema";

export default function StaffDashboard() {
  const { toast } = useToast();
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  // Face verification state
  const [faceDialogOpen, setFaceDialogOpen] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [faceapi, setFaceapi] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Parts request dialog state
  const [partsDialogOpen, setPartsDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [partsNotes, setPartsNotes] = useState("");
  const [partsItems, setPartsItems] = useState<{ itemName: string; quantity: number; notes: string }[]>([
    { itemName: "", quantity: 1, notes: "" }
  ]);

  // Fetch staff profile
  const { data: profile, isLoading: profileLoading } = useQuery<WorkshopStaff>({
    queryKey: ['/api/staff/me/profile'],
  });

  // Fetch today's attendance
  const { data: todayAttendance, refetch: refetchToday } = useQuery<StaffAttendance | null>({
    queryKey: ['/api/staff/me/attendance/today'],
  });

  // Fetch attendance history
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery<StaffAttendance[]>({
    queryKey: ['/api/staff/me/attendance'],
  });

  // Fetch commissions
  const { data: commissions = [], isLoading: commissionsLoading } = useQuery<StaffCommission[]>({
    queryKey: ['/api/staff/me/commissions'],
  });

  // Fetch assigned jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery<WorkshopJob[]>({
    queryKey: ['/api/staff/me/jobs'],
  });

  // Fetch parts requests
  type PartsRequestWithItems = JobPartsRequest & { items: JobPartRequestItem[] };
  const { data: partsRequests = [], isLoading: partsLoading } = useQuery<PartsRequestWithItems[]>({
    queryKey: ['/api/staff/me/parts-requests'],
  });

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Modern @vladmandic/face-api - ESM-native and Vite-compatible
        const faceApiModule = await import("@vladmandic/face-api");
        setFaceapi(faceApiModule);
        
        const MODEL_URL = '/models';
        await Promise.all([
          faceApiModule.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceApiModule.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceApiModule.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (error) {
        console.error('Failed to load face-api models:', error);
        // Gracefully degrade - face recognition will be disabled
      }
    };
    loadModels();
  }, []);

  // Camera management with strict guards
  const startCamera = async () => {
    // Guard: Prevent concurrent starts
    if (isStartingCamera) {
      console.warn("Camera start already in progress");
      return;
    }
    
    // Guard: Don't start if already active
    if (isCameraActive || streamRef.current) {
      console.warn("Camera already active, skipping start");
      return;
    }
    
    // Guard: Require models to be loaded
    if (!modelsLoaded) {
      throw new Error("Models not loaded yet");
    }
    
    setIsStartingCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      } else {
        // Video ref not available, stop stream and throw
        stream.getTracks().forEach(track => track.stop());
        throw new Error("Video element not ready");
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        variant: "destructive",
        title: "Kamera Diperlukan",
        description: "Sila benarkan akses kamera untuk pengesahan wajah.",
      });
      throw error; // Re-throw to be caught by caller
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Calculate totals
  const totalCommissions = commissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);
  const thisMonthAttendance = attendance.filter(a => {
    const date = new Date(a.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  // Get location
  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(coords);
          resolve(coords);
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            reject(new Error("Location permission denied"));
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            reject(new Error("Location unavailable"));
          } else if (error.code === error.TIMEOUT) {
            reject(new Error("Location request timeout"));
          } else {
            reject(error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Clock in mutation with face verification
  const clockInMutation = useMutation({
    mutationFn: async (faceDescriptor: number[]) => {
      if (!profile) throw new Error("Profile not loaded");
      
      const coords = await getLocation();
      
      const res = await apiRequest("POST", "/api/workshop/attendance/clock-in", {
        staffId: profile.id,
        latitude: coords.lat,
        longitude: coords.lng,
        verificationMethod: 'geofence+face',
        faceDescriptor: faceDescriptor,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Berjaya Clock In",
        description: "Kehadiran anda telah direkodkan.",
      });
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ['/api/staff/me/attendance'] });
    },
    onError: (error: any) => {
      let errorMessage = "Gagal merekod kehadiran.";
      
      if (error?.message) {
        if (error.message.includes("not supported")) {
          errorMessage = "Peranti anda tidak menyokong ciri lokasi GPS.";
        } else if (error.message.includes("denied")) {
          errorMessage = "Sila benarkan akses lokasi GPS dalam tetapan pelayar anda.";
        } else if (error.message.includes("unavailable")) {
          errorMessage = "Lokasi GPS tidak tersedia. Sila aktifkan GPS anda.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Masa tamat untuk mendapatkan lokasi GPS. Cuba lagi.";
        } else if (error.message.includes("geofence radius")) {
          errorMessage = "Anda tidak berada dalam kawasan bengkel. Sila pastikan anda berada di premis bengkel untuk clock in.";
        } else {
          try {
            const match = error.message.match(/\{.*\}/);
            if (match && match.length > 0) {
              const errorJson = JSON.parse(match[0]);
              if (errorJson?.message) {
                if (errorJson.message.includes("geofence radius")) {
                  errorMessage = "Anda tidak berada dalam kawasan bengkel. Sila pastikan anda berada di premis bengkel untuk clock in.";
                } else {
                  errorMessage = errorJson.message;
                }
              }
            }
          } catch (parseError) {
            console.error("Error parsing error message:", parseError);
          }
        }
      }
      
      toast({
        variant: "destructive",
        title: "Gagal Clock In",
        description: errorMessage,
      });
    },
  });

  const handleClockIn = async () => {
    // Critical: Block if models not loaded
    if (!modelsLoaded) {
      toast({
        variant: "destructive",
        title: "Model Belum Siap",
        description: "Sila tunggu sebentar, sistem pengesahan wajah sedang dimuat. Jika masalah berterusan, sila muat semula halaman.",
      });
      return; // DO NOT proceed to dialog/camera
    }
    
    try {
      // Await camera start - this will throw if it fails
      await startCamera();
      
      // CRITICAL FIX: Check synchronous ref, not async state
      // React state (isCameraActive) hasn't updated yet, but refs are synchronous
      if (!streamRef.current || !videoRef.current?.srcObject) {
        throw new Error("Camera failed to activate");
      }
      
      // Safe to open dialog now
      setFaceDialogOpen(true);
    } catch (error) {
      console.error("Failed to start camera:", error);
      // Dialog will NOT open because we're in catch block
      toast({
        variant: "destructive",
        title: "Gagal Membuka Kamera",
        description: "Tidak dapat mengakses kamera. Sila pastikan kamera anda berfungsi dan benarkan akses kamera.",
      });
    }
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current || !modelsLoaded || !faceapi) return;

    setIsClockingIn(true);
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast({
          variant: "destructive",
          title: "Wajah Tidak Dikesan",
          description: "Sila letakkan wajah anda di hadapan kamera dengan jelas.",
        });
        return; // finally block will handle cleanup
      }

      // Convert Float32Array to regular array and ensure it's serializable
      const descriptor = Array.from(detection.descriptor).map(val => Number(val));
      
      // Validate descriptor before sending
      if (!descriptor || descriptor.length !== 128) {
        toast({
          variant: "destructive",
          title: "Gagal Ekstrak Wajah",
          description: "Penerimaan wajah tidak lengkap. Sila cuba lagi.",
        });
        return; // finally block will handle cleanup
      }
      
      await clockInMutation.mutateAsync(descriptor);
      
      // Success path: close dialog and stop camera
      setFaceDialogOpen(false);
      stopCamera();
    } catch (error) {
      console.error("Face capture failed:", error);
      // On error: restart camera for immediate retry
      stopCamera();
      toast({
        variant: "destructive",
        title: "Gagal Clock In",
        description: "Terdapat masalah semasa pengesahan. Sila cuba lagi.",
      });
      
      // Restart camera after brief delay to allow cleanup
      setTimeout(async () => {
        try {
          await startCamera();
        } catch (restartError) {
          console.error("Failed to restart camera:", restartError);
          // If camera restart fails, close dialog
          setFaceDialogOpen(false);
        }
      }, 500);
    } finally {
      // Always reset loading state
      setIsClockingIn(false);
    }
  };

  // Parts request mutation
  const createPartsRequestMutation = useMutation({
    mutationFn: async () => {
      // Validate job selection
      if (!selectedJobId) {
        throw new Error("Sila pilih tugasan terlebih dahulu");
      }
      
      // Validate and filter items
      const validItems = partsItems.filter(item => {
        const hasValidName = item.itemName.trim().length > 0;
        const hasValidQuantity = item.quantity > 0;
        return hasValidName && hasValidQuantity;
      });
      
      if (validItems.length === 0) {
        throw new Error("Sila tambah sekurang-kurangnya satu item yang sah");
      }
      
      // Additional validation: check for empty names or invalid quantities
      const hasInvalidItem = partsItems.some(item => {
        if (item.itemName.trim().length === 0) return false; // Will be filtered out
        return item.quantity <= 0;
      });
      
      if (hasInvalidItem) {
        throw new Error("Kuantiti mesti lebih daripada 0");
      }
      
      return await apiRequest('/api/staff/me/parts-requests', {
        method: 'POST',
        body: JSON.stringify({
          jobId: selectedJobId,
          notes: partsNotes,
          items: validItems,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/me/parts-requests'] });
      toast({
        title: "Berjaya",
        description: "Permintaan alat ganti telah dihantar",
      });
      // Reset form
      setPartsDialogOpen(false);
      setSelectedJobId("");
      setPartsNotes("");
      setPartsItems([{ itemName: "", quantity: 1, notes: "" }]);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: error.message || "Gagal menghantar permintaan",
      });
    },
  });

  // Helper functions for items management
  const addPartsItem = () => {
    setPartsItems([...partsItems, { itemName: "", quantity: 1, notes: "" }]);
  };

  const removePartsItem = (index: number) => {
    if (partsItems.length > 1) {
      setPartsItems(partsItems.filter((_, i) => i !== index));
    }
  };

  const updatePartsItem = (index: number, field: keyof typeof partsItems[0], value: string | number) => {
    const updated = [...partsItems];
    updated[index] = { ...updated[index], [field]: value };
    setPartsItems(updated);
  };

  if (profileLoading) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
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
              Tidak dapat memuatkan profil staff anda. Sila hubungi pengurus bengkel anda.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-staff-name">{profile.name}</h1>
          <p className="text-muted-foreground" data-testid="text-staff-role">{profile.role}</p>
        </div>
        <User className="h-8 w-8 text-primary" />
      </div>

      {/* Today's Status & Quick Actions */}
      <Card data-testid="card-today-status">
        <CardHeader>
          <CardTitle className="text-lg">Kehadiran Hari Ini</CardTitle>
          <CardDescription>
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayAttendance ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Sudah Clock In</span>
                </div>
                <Badge variant="default" data-testid="badge-status">
                  {todayAttendance.status === 'present' ? 'Hadir' : 
                   todayAttendance.status === 'late' ? 'Lewat' : 
                   todayAttendance.status === 'absent' ? 'Tidak Hadir' : 
                   todayAttendance.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Clock In</p>
                  <p className="font-mono font-medium" data-testid="text-clock-in">
                    {todayAttendance.clockIn ? format(new Date(todayAttendance.clockIn), "HH:mm") : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Clock Out</p>
                  <p className="font-mono font-medium" data-testid="text-clock-out">
                    {todayAttendance.clockOut ? format(new Date(todayAttendance.clockOut), "HH:mm") : "-"}
                  </p>
                </div>
              </div>

              {todayAttendance.hoursWorked && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Jam Bekerja</p>
                  <p className="text-2xl font-bold font-mono" data-testid="text-hours-worked">
                    {Number(todayAttendance.hoursWorked).toFixed(1)}j
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <span>Anda belum clock in hari ini</span>
              </div>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleClockIn}
                disabled={isClockingIn}
                data-testid="button-clock-in"
              >
                <LogIn className="mr-2 h-5 w-5" />
                {isClockingIn ? "Sedang Clock In..." : "Clock In Sekarang"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Face Verification Dialog */}
      <Dialog open={faceDialogOpen} onOpenChange={(open) => {
        setFaceDialogOpen(open);
        if (!open) stopCamera();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pengesahan Wajah</DialogTitle>
            <DialogDescription>
              Sila letakkan wajah anda di hadapan kamera untuk pengesahan kehadiran
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="video-face-verification"
              />
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Kamera sedang dimuat...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-secondary/30 p-3 rounded-md">
              <p className="text-sm text-center text-muted-foreground">
                Pastikan wajah anda kelihatan dengan jelas dan pencahayaan mencukupi
              </p>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                stopCamera();
                setFaceDialogOpen(false);
              }}
              disabled={isClockingIn}
              data-testid="button-cancel-face-verification"
            >
              Batal
            </Button>
            <Button
              onClick={handleCaptureFace}
              disabled={!isCameraActive || isClockingIn}
              data-testid="button-capture-face"
            >
              {isClockingIn ? "Memproses..." : "Tangkap Wajah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card data-testid="card-monthly-attendance">
          <CardHeader className="pb-3">
            <CardDescription>Bulan Ini</CardDescription>
            <CardTitle className="text-2xl font-mono">{thisMonthAttendance}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Hari Hadir</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-total-commissions">
          <CardHeader className="pb-3">
            <CardDescription>Jumlah Pendapatan</CardDescription>
            <CardTitle className="text-2xl font-mono">RM {totalCommissions.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Komisen</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="jobs" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="jobs" data-testid="tab-jobs">
            <Wrench className="h-4 w-4 mr-2" />
            Tugasan
          </TabsTrigger>
          <TabsTrigger value="parts" data-testid="tab-parts">
            <Package className="h-4 w-4 mr-2" />
            Alat Ganti
          </TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">
            <Clock className="h-4 w-4 mr-2" />
            Kehadiran
          </TabsTrigger>
          <TabsTrigger value="commissions" data-testid="tab-commissions">
            <DollarSign className="h-4 w-4 mr-2" />
            Komisen
          </TabsTrigger>
          <TabsTrigger value="payslips" data-testid="tab-payslips">
            <FileText className="h-4 w-4 mr-2" />
            Slip Gaji
          </TabsTrigger>
        </TabsList>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-3 mt-4">
          {jobsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tiada tugasan lagi</p>
                <p className="text-sm mt-2">Tugasan akan dipaparkan di sini apabila pengurus bengkel menugaskan kerja kepada anda</p>
              </CardContent>
            </Card>
          ) : (
            jobs.map((job) => (
              <Card key={job.id} data-testid={`job-${job.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{job.plateNo}</CardTitle>
                      <CardDescription className="text-sm">{job.vehicleModel}</CardDescription>
                    </div>
                    <Badge 
                      variant={
                        job.status === 'completed' ? 'default' :
                        job.status === 'in_progress' ? 'secondary' : 
                        job.status === 'cancelled' ? 'destructive' : 'outline'
                      }
                      data-testid={`badge-job-status-${job.id}`}
                    >
                      {job.status === 'completed' ? 'Selesai' :
                       job.status === 'in_progress' ? 'Sedang Berjalan' :
                       job.status === 'cancelled' ? 'Dibatalkan' : 'Menunggu'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Jenis Servis</p>
                    <p className="font-medium">{job.serviceType}</p>
                  </div>
                  
                  {job.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Catatan</p>
                      <p className="text-sm">{job.description}</p>
                    </div>
                  )}
                  
                  {job.progress !== null && job.progress !== undefined && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Kemajuan</span>
                        <span className="font-mono font-medium">{job.progress}%</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-300" 
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3 text-sm pt-2 border-t">
                    <div>
                      <p className="text-muted-foreground">Dijangka</p>
                      <p className="font-mono">RM {job.estimatedCost ? Number(job.estimatedCost).toFixed(2) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sebenar</p>
                      <p className="font-mono">RM {job.actualCost ? Number(job.actualCost).toFixed(2) : '-'}</p>
                    </div>
                  </div>
                  
                  {job.startTime && (
                    <div className="text-xs text-muted-foreground">
                      Dimulakan: {format(new Date(job.startTime), "dd MMM yyyy, HH:mm")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Parts Request Tab */}
        <TabsContent value="parts" className="space-y-3 mt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Permintaan Alat Ganti</h3>
            <Dialog open={partsDialogOpen} onOpenChange={setPartsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-parts-request">
                  <Plus className="h-4 w-4 mr-2" />
                  Permintaan Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Permintaan Alat Ganti Baru</DialogTitle>
                  <DialogDescription>
                    Mohon alat ganti untuk tugasan anda
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Job Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="job-select">Pilih Tugasan</Label>
                    <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                      <SelectTrigger id="job-select" data-testid="select-job">
                        <SelectValue placeholder="Pilih tugasan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.plateNo} - {job.vehicleModel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Items List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Senarai Alat Ganti</Label>
                      <Button type="button" size="sm" variant="outline" onClick={addPartsItem} data-testid="button-add-item">
                        <Plus className="h-3 w-3 mr-1" />
                        Tambah Item
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {partsItems.map((item, index) => (
                        <Card key={index} data-testid={`parts-item-${index}`}>
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Label htmlFor={`item-name-${index}`} className="text-xs">Nama Item</Label>
                                <Input
                                  id={`item-name-${index}`}
                                  placeholder="Cth: Minyak Enjin 10W-40"
                                  value={item.itemName}
                                  onChange={(e) => updatePartsItem(index, 'itemName', e.target.value)}
                                  data-testid={`input-item-name-${index}`}
                                />
                              </div>
                              <div className="w-24">
                                <Label htmlFor={`item-qty-${index}`} className="text-xs">Kuantiti</Label>
                                <Input
                                  id={`item-qty-${index}`}
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updatePartsItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  data-testid={`input-item-quantity-${index}`}
                                />
                              </div>
                              {partsItems.length > 1 && (
                                <div className="flex items-end">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removePartsItem(index)}
                                    data-testid={`button-remove-item-${index}`}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div>
                              <Label htmlFor={`item-notes-${index}`} className="text-xs">Catatan (Optional)</Label>
                              <Input
                                id={`item-notes-${index}`}
                                placeholder="Cth: Brand tertentu"
                                value={item.notes}
                                onChange={(e) => updatePartsItem(index, 'notes', e.target.value)}
                                data-testid={`input-item-notes-${index}`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* General Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="parts-notes">Catatan Tambahan (Optional)</Label>
                    <Textarea
                      id="parts-notes"
                      placeholder="Butiran tambahan untuk permintaan ini..."
                      value={partsNotes}
                      onChange={(e) => setPartsNotes(e.target.value)}
                      rows={3}
                      data-testid="textarea-parts-notes"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setPartsDialogOpen(false)}
                    data-testid="button-cancel-parts-request"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={() => createPartsRequestMutation.mutate()}
                    disabled={!selectedJobId || createPartsRequestMutation.isPending}
                    data-testid="button-submit-parts-request"
                  >
                    {createPartsRequestMutation.isPending ? "Menghantar..." : "Hantar Permintaan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {partsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : partsRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tiada permintaan alat ganti lagi</p>
                <p className="text-sm mt-2">Klik "Permintaan Baru" untuk memohon alat ganti</p>
              </CardContent>
            </Card>
          ) : (
            partsRequests.map((request) => {
              const job = jobs.find(j => j.id === request.jobId);
              return (
                <Card key={request.id} data-testid={`parts-request-${request.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">
                          {job ? `${job.plateNo} - ${job.vehicleModel}` : 'Tugasan tidak dijumpai'}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          {format(new Date(request.createdAt), "dd MMM yyyy, HH:mm")}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={
                          request.status === 'fulfilled' ? 'default' :
                          request.status === 'approved' ? 'secondary' :
                          request.status === 'rejected' ? 'destructive' : 'outline'
                        }
                        data-testid={`badge-request-status-${request.id}`}
                      >
                        {request.status === 'fulfilled' ? 'Dipenuhi' :
                         request.status === 'approved' ? 'Diluluskan' :
                         request.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Senarai Item ({request.items.length})</p>
                      <div className="space-y-1">
                        {request.items.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-secondary/30">
                            <span className="font-medium">{item.itemName}</span>
                            <span className="text-muted-foreground">× {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {request.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Catatan</p>
                        <p className="text-sm">{request.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-3 mt-4">
          {attendanceLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : attendance.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tiada rekod kehadiran lagi</p>
              </CardContent>
            </Card>
          ) : (
            attendance.map((record) => (
              <Card key={record.id} data-testid={`attendance-${record.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {format(new Date(record.date), "MMM dd, yyyy")}
                    </CardTitle>
                    <Badge 
                      variant={
                        record.status === 'present' ? 'default' :
                        record.status === 'late' ? 'secondary' : 'destructive'
                      }
                    >
                      {record.status === 'present' ? 'Hadir' : 
                       record.status === 'late' ? 'Lewat' : 
                       record.status === 'absent' ? 'Tidak Hadir' : 
                       record.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Clock In</p>
                      <p className="font-mono">
                        {record.clockIn ? format(new Date(record.clockIn), "HH:mm") : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Clock Out</p>
                      <p className="font-mono">
                        {record.clockOut ? format(new Date(record.clockOut), "HH:mm") : "-"}
                      </p>
                    </div>
                  </div>
                  {record.hoursWorked && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-muted-foreground">Jam Bekerja</p>
                      <p className="font-mono font-medium">{Number(record.hoursWorked).toFixed(1)}j</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="commissions" className="space-y-3 mt-4">
          {commissionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : commissions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tiada komisen lagi</p>
              </CardContent>
            </Card>
          ) : (
            commissions.map((commission) => (
              <Card key={commission.id} data-testid={`commission-${commission.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-mono">
                      RM {Number(commission.commissionAmount).toFixed(2)}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(commission.date), "MMM dd, yyyy")}
                    </CardDescription>
                  </div>
                </CardHeader>
                {commission.notes && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{commission.notes}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="payslips" className="space-y-3 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gaji Bulanan</CardTitle>
              <CardDescription>Gaji asas dan jumlah pendapatan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Gaji Asas</p>
                <p className="text-2xl font-bold font-mono" data-testid="text-basic-salary">
                  RM {Number(profile.basicSalary).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kadar Komisen</p>
                <p className="text-lg font-mono" data-testid="text-commission-rate">
                  {Number(profile.commissionRate || 0).toFixed(1)}%
                </p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">Jumlah Pendapatan (Bulan Ini)</p>
                <p className="text-3xl font-bold font-mono text-primary" data-testid="text-total-earnings">
                  RM {(Number(profile.basicSalary) + totalCommissions).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
