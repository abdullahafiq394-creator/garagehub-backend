import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Camera, QrCode, Loader2, UserPlus, X } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import * as faceapi from 'face-api.js';

interface StaffMember {
  id: string;
  workshopId: string;
  name: string;
  position: string;
  hourlyRate: number;
  commissionRate: number;
  userId: string | null;
  faceDescriptor: number[] | null;
  createdAt: string;
}

interface AddStaffFormData {
  name: string;
  position: string;
  hourlyRate: number;
  commissionRate: number;
  photoUrl: string | null;
  faceDescriptor: number[] | null;
}

export default function StaffManagementTab() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [enrollingFace, setEnrollingFace] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [formData, setFormData] = useState<AddStaffFormData>({
    name: '',
    position: '',
    hourlyRate: 0,
    commissionRate: 0,
    photoUrl: null,
    faceDescriptor: null,
  });
  
  // Registration photo capture state
  const [isCapturingPhoto, setIsCapturingPhoto] = useState(false);
  const [capturedPhotoBlob, setCapturedPhotoBlob] = useState<Blob | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoUploadInProgress, setPhotoUploadInProgress] = useState(false);
  const registrationVideoRef = useRef<HTMLVideoElement>(null);
  const registrationStreamRef = useRef<MediaStream | null>(null);

  // Get staff list
  const { data: staff, isLoading } = useQuery<StaffMember[]>({
    queryKey: ['/api/workshop-dashboard/staff'],
  });

  // Load face-api models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (error) {
        console.error('Failed to load face-api models:', error);
      }
    };
    loadModels();
  }, []);

  const [newStaffCredentials, setNewStaffCredentials] = useState<{
    email: string;
    temporaryPassword: string;
  } | null>(null);

  // Add staff mutation
  const addStaffMutation = useMutation({
    mutationFn: async (data: AddStaffFormData) => {
      const res = await apiRequest('POST', '/api/workshop-dashboard/staff', data);
      return res.json();
    },
    onSuccess: (result: { staff: StaffMember; credentials: { email: string; temporaryPassword: string } }) => {
      toast({
        title: "Staff Added",
        description: "New staff member has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-dashboard/staff'] });
      setIsAddDialogOpen(false);
      setFormData({ name: '', position: '', hourlyRate: 0, commissionRate: 0, photoUrl: null, faceDescriptor: null });
      handleRemovePhoto();
      // Show credentials modal
      setNewStaffCredentials(result.credentials);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to Add Staff",
        description: error.message || "An error occurred.",
      });
    },
  });

  // Enroll face mutation
  const enrollFaceMutation = useMutation({
    mutationFn: async ({ staffId, descriptor }: { staffId: string; descriptor: number[] }) => {
      const res = await apiRequest('POST', `/api/workshop/staff/${staffId}/enroll-face`, {
        faceDescriptor: descriptor,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Face Enrolled",
        description: "Face recognition has been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-dashboard/staff'] });
      stopCamera();
      setEnrollingFace(false);
      setSelectedStaff(null);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Enrollment Failed",
        description: error.message || "Failed to enroll face.",
      });
    },
  });

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        variant: "destructive",
        title: "Camera Access Required",
        description: "Please allow camera access to enroll face.",
      });
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
  };

  const handleCaptureFace = async () => {
    if (!videoRef.current || !selectedStaff || !modelsLoaded) return;

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        toast({
          variant: "destructive",
          title: "No Face Detected",
          description: "Please position your face clearly in the camera.",
        });
        return;
      }

      await enrollFaceMutation.mutateAsync({
        staffId: selectedStaff.id,
        descriptor: Array.from(detection.descriptor),
      });
    } catch (error) {
      console.error('Face capture error:', error);
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: "Failed to capture face data.",
      });
    }
  };

  const handleStartFaceEnrollment = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setEnrollingFace(true);
    startCamera();
  };

  const handleCancelEnrollment = () => {
    stopCamera();
    setEnrollingFace(false);
    setSelectedStaff(null);
  };

  const handleShowQR = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    setShowQR(true);
  };

  // Registration photo capture functions
  const startRegistrationCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      if (registrationVideoRef.current) {
        registrationVideoRef.current.srcObject = stream;
        registrationStreamRef.current = stream;
      }
      setIsCapturingPhoto(true);
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        variant: "destructive",
        title: "Camera Access Required",
        description: "Please allow camera access to capture staff photo.",
      });
    }
  };

  const stopRegistrationCamera = () => {
    if (registrationStreamRef.current) {
      registrationStreamRef.current.getTracks().forEach(track => track.stop());
      registrationStreamRef.current = null;
    }
    if (registrationVideoRef.current) {
      registrationVideoRef.current.srcObject = null;
    }
    setIsCapturingPhoto(false);
  };

  const handleCaptureRegistrationPhoto = async () => {
    if (!registrationVideoRef.current) {
      toast({
        variant: "destructive",
        title: "Not Ready",
        description: "Camera not ready. Please try again.",
      });
      return;
    }

    try {
      let faceDescriptor: number[] | null = null;

      // Try to detect face and extract descriptor if models are loaded
      if (modelsLoaded) {
        try {
          const detection = await faceapi
            .detectSingleFace(registrationVideoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            faceDescriptor = Array.from(detection.descriptor);
          } else {
            toast({
              title: "Face Detection",
              description: "No face detected. Photo captured anyway - face can be enrolled later.",
            });
          }
        } catch (faceError) {
          console.error('Face detection error:', faceError);
          // Continue without face descriptor
        }
      }

      // Capture photo as blob regardless of face detection
      const canvas = document.createElement('canvas');
      canvas.width = registrationVideoRef.current.videoWidth;
      canvas.height = registrationVideoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(registrationVideoRef.current, 0, 0);
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
      });

      // Store photo and descriptor
      setCapturedPhotoBlob(blob);
      setPhotoPreviewUrl(URL.createObjectURL(blob));
      setFormData(prev => ({ ...prev, faceDescriptor }));
      
      stopRegistrationCamera();

      // Upload photo to object storage
      await handleUploadPhoto(blob);

    } catch (error) {
      console.error('Face capture error:', error);
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: "Failed to capture face data.",
      });
    }
  };

  const handleUploadPhoto = async (photoBlob: Blob) => {
    setPhotoUploadInProgress(true);
    try {
      // Step 1: Get presigned URL
      const uploadResponse = await apiRequest('POST', '/api/workshop-staff/photo/upload', {
        contentType: photoBlob.type,
      });
      const { objectId, uploadUrl } = await uploadResponse.json();

      // Step 2: Upload to GCS
      const uploadResult = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': photoBlob.type },
        body: photoBlob,
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload photo to storage');
      }

      // Step 3: Finalize upload
      const finalizeResponse = await apiRequest('PUT', '/api/workshop-staff/photo', {
        objectId,
      });
      const { photoUrl } = await finalizeResponse.json();

      // Update form data with photoUrl
      setFormData(prev => ({ ...prev, photoUrl }));

      toast({
        title: "Photo Uploaded",
        description: "Staff photo has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      toast({
        title: "Photo Upload Skipped",
        description: "Photo storage not available. You can still add the staff member - photo can be added later when storage is enabled.",
      });
      // Keep the preview but mark photoUrl as placeholder
      setFormData(prev => ({ ...prev, photoUrl: null }));
    } finally {
      setPhotoUploadInProgress(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      let faceDescriptor: number[] | null = null;

      // Try face detection only if models are loaded
      if (modelsLoaded) {
        try {
          // Create image element for face detection
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = URL.createObjectURL(file);
          });

          // Detect face and extract descriptor
          const detection = await faceapi
            .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            faceDescriptor = Array.from(detection.descriptor);
          } else {
            toast({
              title: "Face Detection",
              description: "No face detected. Photo saved anyway - face can be enrolled later.",
            });
          }
        } catch (faceError) {
          console.error('Face detection error:', faceError);
          // Continue without face descriptor
        }
      }

      // Store photo regardless of face detection
      setCapturedPhotoBlob(file);
      setPhotoPreviewUrl(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, faceDescriptor }));

      // Upload photo to object storage
      await handleUploadPhoto(file);

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Photo Processing",
        description: "Photo saved locally. Cloud upload skipped - staff can be added without photo.",
      });
    }
  };

  const handleRemovePhoto = () => {
    setCapturedPhotoBlob(null);
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setPhotoPreviewUrl(null);
    setFormData(prev => ({ ...prev, photoUrl: null, faceDescriptor: null }));
  };

  useEffect(() => {
    return () => {
      stopCamera();
      stopRegistrationCamera();
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-full">
          <h2 className="text-2xl font-bold text-foreground">Staff Management</h2>
          <p className="text-muted-foreground mt-2">Manage workshop staff and enrollment</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            // Reset form and photo state when closing
            setFormData({ name: '', position: '', hourlyRate: 0, commissionRate: 0, photoUrl: null, faceDescriptor: null });
            handleRemovePhoto();
            stopRegistrationCamera();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" data-testid="button-add-staff">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-staff">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>Enter staff member details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-staff-name"
                />
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  data-testid="input-staff-position"
                />
              </div>
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate (RM)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: parseFloat(e.target.value) })}
                  data-testid="input-hourly-rate"
                />
              </div>
              <div>
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                  data-testid="input-commission-rate"
                />
              </div>

              {/* Photo Capture Section - OPTIONAL */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Staff Photo (Optional)</Label>
                <p className="text-sm text-muted-foreground">Capture or upload a clear photo for face recognition (can be added later)</p>
                
                {!photoPreviewUrl && !isCapturingPhoto && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startRegistrationCamera}
                      disabled={photoUploadInProgress}
                      data-testid="button-capture-photo"
                      className="flex-1"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Capture Photo
                    </Button>
                    <label htmlFor="photo-upload" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={photoUploadInProgress}
                        data-testid="button-upload-photo"
                        className="w-full"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Upload Photo
                      </Button>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                )}

                {/* Camera Preview */}
                {isCapturingPhoto && (
                  <div className="space-y-2">
                    <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
                      <video
                        ref={registrationVideoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        data-testid="video-camera-preview"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleCaptureRegistrationPhoto}
                        disabled={photoUploadInProgress}
                        data-testid="button-capture-now"
                        className="flex-1"
                      >
                        {photoUploadInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Capture
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopRegistrationCamera}
                        disabled={photoUploadInProgress}
                        data-testid="button-cancel-capture"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Photo Preview */}
                {photoPreviewUrl && (
                  <div className="space-y-2">
                    <div className="relative w-full aspect-video rounded-md overflow-hidden border">
                      <img
                        src={photoPreviewUrl}
                        alt="Staff photo preview"
                        className="w-full h-full object-cover"
                        data-testid="img-photo-preview"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemovePhoto}
                        data-testid="button-remove-photo"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Badge variant="default" className="w-full justify-center">
                      <Camera className="mr-1 h-3 w-3" />
                      Photo uploaded - Face detected
                    </Badge>
                  </div>
                )}
              </div>

              <Button
                onClick={() => addStaffMutation.mutate(formData)}
                disabled={addStaffMutation.isPending || photoUploadInProgress || !formData.name || !formData.position}
                data-testid="button-submit-staff"
              >
                {addStaffMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Staff'
                )}
              </Button>
              {!formData.name && <p className="text-sm text-muted-foreground text-center">Please enter staff name to continue</p>}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff List */}
      {isLoading ? (
        <div className="text-center py-12">Loading...</div>
      ) : !staff || staff.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No staff members yet. Add your first staff member to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <Card key={member.id} data-testid={`card-staff-${member.id}`}>
              <CardHeader>
                <CardTitle>{member.name}</CardTitle>
                <CardDescription>{member.position}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Hourly Rate</p>
                      <p className="font-medium">RM {member.hourlyRate?.toFixed(2) ?? '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Commission</p>
                      <p className="font-medium">{member.commissionRate ?? 0}%</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={member.userId ? 'default' : 'outline'}>
                      {member.userId ? 'Linked' : 'Not Linked'}
                    </Badge>
                    <Badge variant={member.faceDescriptor ? 'default' : 'outline'}>
                      {member.faceDescriptor ? 'Face Enrolled' : 'No Face'}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowQR(member)}
                      data-testid={`button-show-qr-${member.id}`}
                    >
                      <QrCode className="mr-1 h-3 w-3" />
                      QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartFaceEnrollment(member)}
                      disabled={!member.userId}
                      data-testid={`button-enroll-face-${member.id}`}
                    >
                      <Camera className="mr-1 h-3 w-3" />
                      Face
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent data-testid="dialog-qr-code">
          <DialogHeader>
            <DialogTitle>Staff QR Code</DialogTitle>
            <DialogDescription>
              {selectedStaff?.name} - Scan this code to clock in
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <div className="flex flex-col items-center gap-4">
              <QRCodeSVG
                value={`STAFF:${selectedStaff.id}`}
                size={256}
                level="H"
                data-testid="qr-code-display"
              />
              <p className="text-sm text-muted-foreground">Staff ID: {selectedStaff.id}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Face Enrollment Dialog */}
      <Dialog open={enrollingFace} onOpenChange={(open) => !open && handleCancelEnrollment()}>
        <DialogContent data-testid="dialog-face-enrollment">
          <DialogHeader>
            <DialogTitle>Enroll Face Recognition</DialogTitle>
            <DialogDescription>
              {selectedStaff?.name} - Position your face clearly in the camera
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full max-w-md mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
                data-testid="video-face-enrollment"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCaptureFace}
                disabled={!modelsLoaded || enrollFaceMutation.isPending}
                data-testid="button-capture-face"
              >
                {enrollFaceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Capture Face
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEnrollment}
                data-testid="button-cancel-enrollment"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Staff Credentials Dialog */}
      <Dialog open={!!newStaffCredentials} onOpenChange={() => setNewStaffCredentials(null)}>
        <DialogContent data-testid="dialog-staff-credentials">
          <DialogHeader>
            <DialogTitle>Staff Account Created</DialogTitle>
            <DialogDescription>
              Save these credentials and share them with the staff member. The password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-mono text-sm font-medium" data-testid="text-staff-email">
                  {newStaffCredentials?.email}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                <p className="font-mono text-sm font-medium" data-testid="text-staff-password">
                  {newStaffCredentials?.temporaryPassword}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              <span className="text-yellow-600">⚠️</span>
              <p className="text-muted-foreground">
                Make sure to copy and save these credentials. The password cannot be recovered and will need to be reset if lost.
              </p>
            </div>
            <Button
              onClick={() => setNewStaffCredentials(null)}
              className="w-full"
              data-testid="button-close-credentials"
            >
              I've Saved the Credentials
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
