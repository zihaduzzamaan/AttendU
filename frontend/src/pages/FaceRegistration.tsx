import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const { user, role, completeFaceRegistration } = useAuth();
  const [searchParams] = useSearchParams();
  const isUpdateMode = searchParams.get('mode') === 'update';
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
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // bKash-style verification states
  const [livenessStep, setLivenessStep] = useState<'align' | 'blink' | 'capture' | 'done'>('align');
  const [blinkCount, setBlinkCount] = useState(0);
  const [brightness, setBrightness] = useState(255);
  const [facePosition, setFacePosition] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isCapturingAuto, setIsCapturingAuto] = useState(false);

  const livenessPrompts = {
    align: 'Center your face in the oval',
    blink: 'Great! Now blink your eyes once',
    capture: 'Hold still... capturing...',
    done: 'Verification complete!'
  };

  useEffect(() => {
    if (!user || role !== 'student') {
      navigate('/');
    } else if ((user as any).face_registered && !isUpdateMode) {
      navigate('/student/attendance');
    }
  }, [user, role, navigate, isUpdateMode]);

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


  // Tracking loop for visual feedback & Liveness
  useEffect(() => {
    let active = true;
    let lastEAR = 1.0;

    const track = async () => {
      if (!videoRef.current || !canvasRef.current || !modelsLoaded || stage !== 'capturing') return;

      // Detection
      const detection = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks(true);

      if (active && canvasRef.current && videoRef.current) {
        const displaySize = { width: videoRef.current.offsetWidth, height: videoRef.current.offsetHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);

        // 1. Brightness Check
        const currentBrightness = checkBrightness(videoRef.current);
        setBrightness(currentBrightness);

        if (detection) {
          // Resize detection to display size for accurate coordinate checking
          const resizedDetection = faceapi.resizeResults(detection, displaySize);
          const { box } = resizedDetection.detection;
          const landmarks = resizedDetection.landmarks;

          // 2. Face Position Check (Relative to display oval)
          const faceCenterX = box.x + box.width / 2;
          const faceCenterY = box.y + box.height / 2;
          const canvasCenterX = displaySize.width / 2;
          const canvasCenterY = displaySize.height / 2;

          // Increase tolerance to 80px for easier alignment
          const isCentered =
            Math.abs(faceCenterX - canvasCenterX) < 80 &&
            Math.abs(faceCenterY - canvasCenterY) < 80;

          // Adjustment: Ensure the face is large enough but not too large
          const isRightSize = box.width > displaySize.width * 0.25 && box.width < displaySize.width * 0.7;

          if (isCentered && isRightSize) {
            setFacePosition(box);
            if (livenessStep === 'align') setLivenessStep('blink');
          } else {
            setFacePosition(null);
            // If we lose alignment during blink, go back to align
            if (livenessStep === 'blink') setLivenessStep('align');
          }

          // 3. Blink Detection (only if aligned and in blink step)
          if (livenessStep === 'blink') {
            const ear = calculateEAR(landmarks);

            // More sensitive threshold: real-world blinks often don't reach 0.20
            // Normal open eyes are usually ~0.26 - 0.30
            if (lastEAR > 0.25 && ear < 0.23) {
              setBlinkCount(prev => prev + 1);
              setLivenessStep('capture');
              autoCaptureBatch();
            }
            lastEAR = ear;

            // Visual Feedback: Draw landmarks for debug while it's in blink step
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetection);
              }
            }
          }
        } else {
          setFacePosition(null);
          canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      if (active) requestAnimationFrame(track);
    };

    if (stage === 'capturing') track();
    return () => { active = false; };
  }, [stage, modelsLoaded, livenessStep]);

  // Helpers
  const calculateEAR = (landmarks: faceapi.FaceLandmarks68) => {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const getEAR = (eye: faceapi.Point[]) => {
      const p2_p6 = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
      const p3_p5 = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
      const p1_p4 = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
      return (p2_p6 + p3_p5) / (2.0 * p1_p4);
    };
    return (getEAR(leftEye) + getEAR(rightEye)) / 2;
  };

  const checkBrightness = (video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 40; canvas.height = 40;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 150;
    ctx.drawImage(video, 0, 0, 40, 40);
    const data = ctx.getImageData(0, 0, 40, 40).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return sum / (40 * 40);
  };

  const autoCaptureBatch = async () => {
    if (isCapturingAuto) return;
    setIsCapturingAuto(true);

    const frames: { id: number, url: string, blob: Blob }[] = [];

    for (let i = 0; i < TOTAL_CAPTURES; i++) {
      await new Promise(r => setTimeout(r, 400));
      if (!videoRef.current) break;

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const url = canvas.toDataURL('image/jpeg', 0.95);
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.95));
        frames.push({ id: Date.now() + i, url, blob });
      }
    }

    setCapturedImages(frames);
    setLivenessStep('done');
    setIsCapturingAuto(false);
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

      const result = await completeFaceRegistration(user.id, averageEmbedding);
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
    navigate('/student/attendance');
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

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <Card className="border-2">
          {/* ... Header ... */}
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-black tracking-tight">Interactive Verification</CardTitle>
            <CardDescription className="text-base font-medium">
              {stage === 'loading' && 'Initializing security layer...'}
              {stage === 'intro' && 'Secure identity registration powered by AI'}
              {stage === 'capturing' && (brightness < 70 ? '⚠️ Poor Lighting Detected' : livenessPrompts[livenessStep])}
              {stage === 'processing' && 'Extracting mathematical face signature...'}
              {stage === 'success' && 'Face registered successfully!'}
              {stage === 'error' && 'Verification failed. Please retry.'}
              {stage === 'insecure' && 'Browser security prevented camera access.'}
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

                  {/* bKash-style Oval Mask */}
                  <div className="absolute inset-0 pointer-events-none z-10">
                    <div className="absolute inset-0 bg-black/60" style={{
                      maskImage: 'radial-gradient(ellipse 40% 60% at 50% 50%, transparent 95%, black 100%)',
                      WebkitMaskImage: 'radial-gradient(ellipse 40% 60% at 50% 50%, transparent 95%, black 100%)'
                    }} />

                    {/* Animated Oval Border */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[60%] border-4 rounded-[50%] transition-all duration-300 ${facePosition ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 'border-white/30'}`}>
                      {facePosition && livenessStep === 'blink' && (
                        <div className="absolute inset-0 animate-pulse bg-green-500/10 rounded-[50%]" />
                      )}
                    </div>
                  </div>

                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-20" />

                  {/* Feedback Overlays */}
                  {stage === 'capturing' && (
                    <div className="absolute bottom-10 left-0 right-0 z-30 flex flex-col items-center gap-2">
                      {brightness < 70 && (
                        <div className="bg-yellow-500 text-black px-4 py-1.5 rounded-full text-xs font-bold animate-bounce shadow-lg">
                          💡 Increase Lighting
                        </div>
                      )}
                      {livenessStep === 'blink' && (
                        <div className="bg-primary text-primary-foreground px-6 py-2 rounded-2xl text-sm font-black shadow-2xl animate-in zoom-in slide-in-from-bottom-5">
                          Now Blink! 😉
                        </div>
                      )}
                      {livenessStep === 'capture' && (
                        <div className="bg-green-600 text-white px-8 py-3 rounded-2xl text-lg font-black shadow-2xl animate-pulse">
                          Capturing... Stay still
                        </div>
                      )}
                    </div>
                  )}
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

            {/* PROGRESS & INSTRUCTIONS */}
            {stage === 'capturing' && (
              <div className="text-center space-y-4 animate-fade-in">
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Session Progress</span>
                  <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {Math.floor((capturedImages.length / TOTAL_CAPTURES) * 100)}%
                  </span>
                </div>
                <Progress value={(capturedImages.length / TOTAL_CAPTURES) * 100} className="h-3 rounded-full" />

                <div className="grid grid-cols-2 gap-3 py-2">
                  <div className={`p-3 rounded-2xl border-2 transition-all ${facePosition ? 'bg-green-50 border-green-200' : 'bg-muted border-transparent'}`}>
                    <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${facePosition ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Alignment</div>
                  </div>
                  <div className={`p-3 rounded-2xl border-2 transition-all ${livenessStep === 'done' ? 'bg-green-50 border-green-200' : 'bg-muted border-transparent'}`}>
                    <div className={`w-2 h-2 rounded-full mx-auto mb-2 ${livenessStep === 'done' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="text-[10px] font-bold uppercase text-muted-foreground">Liveness</div>
                  </div>
                </div>
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

              {stage === 'capturing' && livenessStep === 'done' && (
                <Button onClick={handleScanAndSave} className="w-full bg-green-600 hover:bg-green-700 h-16 text-lg font-black shadow-lg shadow-green-200" size="lg" disabled={isUploading}>
                  {isUploading ? <RefreshCw className="w-6 h-6 mr-3 animate-spin" /> : <CheckCircle className="w-6 h-6 mr-3" />}
                  Verify & Finish Registration
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none mb-1">Interactive Guidance</p>
                    <p className="text-[10px] text-muted-foreground">Animated oval frame helps you stay centered.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none mb-1">Liveness Check</p>
                    <p className="text-[10px] text-muted-foreground">Blink to verify you are a real person.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none mb-1">Lighting Guard</p>
                    <p className="text-[10px] text-muted-foreground">Blocks capture if it is too dark for the AI.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-muted/50 p-3 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-none mb-1">Auto-Capture</p>
                    <p className="text-[10px] text-muted-foreground">High-quality frames snapped automatically.</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FaceRegistration;
