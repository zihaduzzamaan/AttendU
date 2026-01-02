import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CheckCircle, RefreshCw, AlertCircle, XCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/services/api';

const TOTAL_CAPTURES = 3;
const CAPTURE_INTERVAL = 1000;

const FaceRegistration = () => {
  const navigate = useNavigate();
  const { pendingStudentId, completeFaceRegistration, selectedRole } = useAuth();
  const [stage, setStage] = useState<'loading' | 'intro' | 'capturing' | 'processing' | 'success' | 'error' | 'insecure'>('intro');
  const [captureCount, setCaptureCount] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [showFlash, setShowFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /* 
    BATCH CAPTURE LOGIC 
    Captures 3 images first, then uploads them all
  */
  const [capturedImages, setCapturedImages] = useState<{ id: number, url: string, blob: Blob }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [embeddings, setEmbeddings] = useState<number[][]>([]);  // Kept for final processing logic
  const [modelsLoaded, setModelsLoaded] = useState(true);

  const instructions = [
    'Look straight at the camera',
    'Turn your head slightly left',
    'Turn your head slightly right',
  ];

  useEffect(() => {
    if (!pendingStudentId || selectedRole !== 'student') {
      navigate('/');
    }
  }, [pendingStudentId, selectedRole, navigate]);

  // Load Models for visual feedback only
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL)
        ]);
        setModelsLoaded(true);
        console.log('✅ Face detection models loaded (for visual feedback only)');
      } catch (error) {
        console.error("Model loading error:", error);
        // Not critical - can still capture without visual feedback
        setModelsLoaded(false);
      }
    };
    loadModels();
  }, []);

  // WebCam Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if ((stage === 'intro' || stage === 'capturing') && modelsLoaded) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error("Camera access is blocked because this site is not using a secure connection (HTTPS or localhost).");
        setStage('insecure');
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: true })
        .then(s => {
          stream = s;
          if (videoRef.current) videoRef.current.srcObject = s;
        })
        .catch(err => {
          console.error("Webcam error:", err);
          setStage('error');
        });
    }
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stage, modelsLoaded]);

  const captureFace = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    try {
      // Capture image from video
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.drawImage(videoRef.current, 0, 0);

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95);
      });

      // Send to Python backend for embedding extraction
      const result = await api.registerFaceEmbedding(blob);

      if (result.success && result.embedding) {
        setEmbeddings(prev => [...prev, result.embedding]);
        setCaptureCount(prev => prev + 1);
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 200);
        console.log(`✅ Captured face ${captureCount + 1}/${TOTAL_CAPTURES}`);
        return true;
      }
    } catch (error) {
      console.error("Capture error:", error);
    }
    return false;
  };

  // Tracking loop for visual feedback
  useEffect(() => {
    let active = true;
    const track = async () => {
      if (!videoRef.current || !canvasRef.current || !modelsLoaded || stage !== 'capturing') return;

      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks(true);

      if (active && canvasRef.current && videoRef.current) {
        const displaySize = { width: videoRef.current.offsetWidth, height: videoRef.current.offsetHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);

        if (detection) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        } else {
          canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      if (active) requestAnimationFrame(track);
    };

    if (stage === 'capturing') track();
    return () => { active = false; };
  }, [stage, modelsLoaded]);



  // Reset state when stage changes to capturing
  useEffect(() => {
    if (stage === 'capturing') {
      setCurrentInstruction(instructions[capturedImages.length]);
    }
  }, [stage, capturedImages]);

  const captureManual = async () => {
    if (!videoRef.current || capturedImages.length >= TOTAL_CAPTURES) return;

    // Create high-quality capture
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(videoRef.current, 0, 0);

    // Get Data URL for preview
    const dataUrl = canvas.toDataURL('image/jpeg');

    // Get Blob for upload
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImages(prev => [
          ...prev,
          { id: Date.now(), url: dataUrl, blob: blob }
        ]);
      }
    }, 'image/jpeg', 0.95);
  };

  const removeImage = (id: number) => {
    setCapturedImages(prev => prev.filter(img => img.id !== id));
  };

  const handleScanAndSave = async () => {
    if (capturedImages.length < TOTAL_CAPTURES) return;

    setIsUploading(true);
    setStage('processing');

    try {
      const newEmbeddings: number[][] = [];

      // Process each image sequentially
      for (let i = 0; i < capturedImages.length; i++) {
        const img = capturedImages[i];
        console.log(`Processing image ${i + 1}/${capturedImages.length} (Blob size: ${img.blob.size} bytes)...`);

        try {
          const result = await api.registerFaceEmbedding(img.blob);
          if (result.success && result.embedding) {
            console.log(`✅ Image ${i + 1} processed successfully.`);
            newEmbeddings.push(result.embedding);
          } else {
            console.warn(`⚠️ Image ${i + 1} failed:`, result);
          }
        } catch (innerError: any) {
          console.error(`❌ Error processing image ${i + 1}:`, innerError);
          if (innerError.message.includes('timed out')) {
            alert(`Image ${i + 1} timed out. The server might be busy or restarting.`);
          }
        }
      }

      console.log(`Processing complete. Success count: ${newEmbeddings.length}/${capturedImages.length}`);

      if (newEmbeddings.length > 0) {
        setEmbeddings(newEmbeddings);

        if (newEmbeddings.length === capturedImages.length) {
          // All good, finalize immediately
          await finalizeWithEmbeddings(newEmbeddings);
        } else {
          // Some failed
          alert(`Only ${newEmbeddings.length} of ${TOTAL_CAPTURES} faces were detected clearly. The rest failed or timed out. Please retake.`);
          setStage('capturing'); // Go back to capturing
          setIsUploading(false);
          setCapturedImages([]);
        }

      } else {
        alert("No faces successfully processed. Server might be down or no faces detected.");
        setStage('capturing');
        setCapturedImages([]);
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Batch upload global error:", error);
      alert("Critical error connecting to server.");
      setStage('capturing');
      setIsUploading(false);
    }
  };

  // Direct finalization helper
  const finalizeWithEmbeddings = async (finalEmbeddings: number[][]) => {
    try {
      // Average the embeddings
      const embeddingLength = finalEmbeddings[0].length;
      const averageEmbedding = new Array(embeddingLength).fill(0);

      finalEmbeddings.forEach(embedding => {
        embedding.forEach((val, i) => averageEmbedding[i] += val);
      });
      averageEmbedding.forEach((val, i, arr) => arr[i] = val / finalEmbeddings.length);

      console.log(`📊 Averaged ${finalEmbeddings.length} embeddings`);

      const result = await completeFaceRegistration(pendingStudentId, averageEmbedding);
      if (result.success) {
        setStage('success');
      } else {
        setStage('error');
      }
    } catch (error) {
      console.error("Finalization error:", error);
      setStage('error');
    } finally {
      setIsUploading(false);
    }
  };



  const startCapture = () => {
    setCaptureCount(0);
    setEmbeddings([]);
    setStage('capturing');
  };

  const handleComplete = () => {
    navigate('/student');
  };

  const handleRetry = () => {
    setCaptureCount(0);
    setEmbeddings([]);
    setStage('intro');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (capturedImages.length >= TOTAL_CAPTURES) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCapturedImages(prev => [
        ...prev,
        { id: Date.now(), url: dataUrl, blob: file }
      ]);
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  };

  if (!pendingStudentId) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <Card className="border-2">
          {/* ... Header ... */}
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Face Registration</CardTitle>
            <CardDescription>
              {stage === 'loading' && 'Loading AI Models...'}
              {stage === 'intro' && 'Position your face in the camera frame to register'}
              {stage === 'capturing' && capturedImages.length < TOTAL_CAPTURES && 'Align face and click Capture'}
              {stage === 'capturing' && capturedImages.length >= TOTAL_CAPTURES && 'Review photos and click Scan & Save'}
              {stage === 'processing' && 'Processing your face data...'}
              {stage === 'success' && 'Face registration complete!'}
              {stage === 'error' && 'Registration failed. Please try again.'}
              {stage === 'insecure' && 'Camera access blocked by browser safety.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ... Video Area ... */}
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden border-2 border-primary/20">
              {stage === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading AI Models...</p>
                </div>
              )}

              {/* LIVE VIDEO VIEW (Always visible during capture) */}
              {(stage === 'intro' || stage === 'capturing') && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                </>
              )}
              {/* ... other status states ... */}
              {stage === 'success' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-center animate-slide-up">
                  <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Registration Successful</p>
                </div>
              )}

              {stage === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 text-center animate-slide-up p-4">
                  <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <p className="text-lg font-medium text-foreground">Camera Error</p>
                  <p className="text-sm text-muted-foreground mt-2">Could not access webcam. Please check permissions.</p>
                </div>
              )}

              {/* ... insecure state ... */}
              {stage === 'insecure' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 text-center animate-slide-up p-6">
                  <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                  {/* ... content ... */}
                  <p className="text-lg font-medium text-foreground">Security Block</p>
                  {/* ... rest of insecure ... */}
                  <div className="text-sm text-muted-foreground mt-4 space-y-3 text-left">
                    <p>Browsers only allow camera access on <b>secure</b> connections.</p>
                    <p><b>How to fix:</b></p>
                    <ul className="list-disc pl-5">
                      <li>Use <b>http://localhost:8081</b> instead of your IP address.</li>
                      <li>Or, use <b>HTTPS</b> if you are accessing from another device.</li>
                    </ul>
                  </div>
                  <Button variant="outline" className="mt-6" onClick={() => window.location.href = window.location.href.replace(window.location.hostname, 'localhost')}>
                    Switch to Localhost
                  </Button>
                </div>
              )}
            </div>

            {/* THUMBNAIL STRIP */}
            {stage === 'capturing' && capturedImages.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2">
                {capturedImages.map((img, idx) => (
                  <div key={img.id} className="relative w-20 h-20 rounded border overflow-hidden shrink-0 group">
                    <img src={img.url} className="w-full h-full object-cover scale-x-[-1]" />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <XCircle className="text-white w-6 h-6" />
                    </button>
                    <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-[10px] px-1">
                      {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* INSTRUCTIONS */}
            {stage === 'capturing' && (
              <div className="text-center space-y-3 animate-fade-in">
                <p className="text-lg font-medium text-foreground">
                  {capturedImages.length < TOTAL_CAPTURES
                    ? instructions[capturedImages.length]
                    : "Ready to Scan!"}
                </p>
                <Progress value={(capturedImages.length / TOTAL_CAPTURES) * 100} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Captured {capturedImages.length} of {TOTAL_CAPTURES}
                </p>
              </div>
            )}

            {stage === 'processing' && (
              <div className="text-center space-y-3 animate-fade-in">
                <RefreshCw className="w-8 h-8 text-primary mx-auto animate-spin" />
                <p className="text-muted-foreground">Scanning and verifying photos...</p>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 flex-col sm:flex-row">
              {stage === 'intro' && (
                <Button onClick={startCapture} className="w-full" size="lg" disabled={!modelsLoaded}>
                  <Camera className="w-5 h-5 mr-2" />
                  Start Face Scan
                </Button>
              )}

              {stage === 'capturing' && capturedImages.length < TOTAL_CAPTURES && (
                <>
                  <Button onClick={captureManual} className="flex-1" size="lg">
                    <Camera className="w-5 h-5 mr-2" />
                    Capture Photo {capturedImages.length + 1}
                  </Button>

                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                    <Button variant="outline" size="lg" className="w-full sm:w-auto">
                      Upload
                    </Button>
                  </div>
                </>
              )}

              {stage === 'capturing' && capturedImages.length >= TOTAL_CAPTURES && (
                <Button onClick={handleScanAndSave} className="w-full" size="lg" disabled={isUploading}>
                  {isUploading ? <RefreshCw className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle className="w-5 h-5 mr-2" />}
                  Scan & Save
                </Button>
              )}

              {stage === 'success' && (
                <Button onClick={handleComplete} className="w-full" size="lg">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Continue to Dashboard
                </Button>
              )}

              {stage === 'error' && (
                <Button onClick={handleRetry} variant="outline" className="w-full" size="lg">
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again
                </Button>
              )}
            </div>

            {stage === 'intro' && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Tips for best results:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ensure good lighting on your face</li>
                  <li>• Remove glasses if possible</li>
                  <li>• Keep a neutral expression initially</li>
                  <li>• Follow the on-screen instructions</li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FaceRegistration;
