import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, CheckCircle, RefreshCw, AlertCircle, XCircle, Scan, Fingerprint, Sparkles, ShieldCheck, ChevronRight } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { api } from '@/services/api';

const TOTAL_CAPTURES = 6;
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
  const [livenessStep, setLivenessStep] = useState<'align' | 'front' | 'left' | 'right' | 'done'>('align');
  const [yaw, setYaw] = useState(0.5); // 0.5 is center
  const [brightness, setBrightness] = useState(255);
  const [distanceGuidance, setDistanceGuidance] = useState<'perfect' | 'too-close' | 'too-far' | null>(null);
  const [facePosition, setFacePosition] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isCapturingAuto, setIsCapturingAuto] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const noseHistory = useRef<{ x: number, y: number }[]>([]);

  const livenessPrompts = {
    align: 'Center your face in the oval',
    front: 'Look straight at the camera',
    left: 'Great! Now turn your head LEFT',
    right: 'Finally, turn your head RIGHT',
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


      navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          // @ts-ignore
          focusMode: 'continuous',
          // @ts-ignore
          advanced: [{ focusMode: 'continuous' }]
        }
      })
        .then(s => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;

            // Enable continuous autofocus
            const videoTrack = s.getVideoTracks()[0];
            if (videoTrack) {
              videoTrack.applyConstraints({
                // @ts-ignore
                advanced: [{ focusMode: 'continuous' }]
              }).catch(() => { });
            }
          }
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

        // 1. Brightness Check (TEMPORARILY DISABLED FOR TESTING)
        // const currentBrightness = checkBrightness(videoRef.current);
        // setBrightness(currentBrightness);
        setBrightness(255); // Force high brightness to disable warnings

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

          // Responsive tolerance: 15% of screen width/height
          // This prevents "pin point" errors on different screen densities
          const toleranceX = displaySize.width * 0.15;
          const toleranceY = displaySize.height * 0.15;

          const isCentered =
            Math.abs(faceCenterX - canvasCenterX) < toleranceX &&
            Math.abs(faceCenterY - canvasCenterY) < toleranceY;

          // Adjustment: Ensure the face is large enough but not too large
          const isRightSize = box.width > displaySize.width * 0.25 && box.width < displaySize.width * 0.7;
          const isTooFar = box.width < displaySize.width * 0.25;
          const isTooClose = box.width > displaySize.width * 0.7;

          // Set distance guidance
          if (isTooFar) {
            setDistanceGuidance('too-far');
          } else if (isTooClose) {
            setDistanceGuidance('too-close');
          } else {
            setDistanceGuidance('perfect');
          }

          if (isCentered && isRightSize) {
            setFacePosition(box);
            if (livenessStep === 'align') setLivenessStep('front');
          } else {
            setFacePosition(null);
          }

          // 3. Pose Detection (Yaw)
          const currentYaw = calculateHeadYaw(landmarks);
          setYaw(currentYaw);

          // 4. Stability Check (Blur prevention)
          const nose = landmarks.getNose()[3];
          noseHistory.current.push({ x: nose.x, y: nose.y });
          if (noseHistory.current.length > 5) noseHistory.current.shift();

          const stability = noseHistory.current.length >= 5 ? calculateStability(noseHistory.current) : 100;
          const stable = stability < 3.5; // Threshold for "still" (Relaxed from 2.5)
          setIsStable(stable);

          if (isCentered && !isCapturingAuto && stable) {
            if (livenessStep === 'front' && Math.abs(currentYaw - 0.5) < 0.12) {
              autoCaptureBurst('front');
            } else if (livenessStep === 'left' && currentYaw > 0.6) {
              autoCaptureBurst('left');
            } else if (livenessStep === 'right' && currentYaw < 0.4) {
              autoCaptureBurst('right');
            }
          }

          // Visual Feedback: Draw yaw debug dots
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              // Draw yaw indicator dots (Green if stable, Blue if moving)
              ctx.fillStyle = stable ? '#22c55e' : '#3b82f6';
              ctx.beginPath();
              ctx.arc(nose.x, nose.y, 8, 0, Math.PI * 2);
              ctx.fill();
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
  }, [stage, modelsLoaded, livenessStep, isCapturingAuto]);

  // Helpers
  // Shutter sound using Web Audio API
  const playShutterSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Camera shutter sound: quick high-to-low chirp
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.05);

      gainNode.gain.setValueAtTime(0.9, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
      console.log('Audio not supported');
    }
  };
  const calculateStability = (history: { x: number, y: number }[]) => {
    let totalDist = 0;
    for (let i = 1; i < history.length; i++) {
      totalDist += Math.sqrt(Math.pow(history[i].x - history[i - 1].x, 2) + Math.pow(history[i].y - history[i - 1].y, 2));
    }
    return totalDist / history.length;
  };

  const calculateHeadYaw = (landmarks: faceapi.FaceLandmarks68) => {
    const noseTip = landmarks.getNose()[3]; // Point 30
    const leftEyeInner = landmarks.getLeftEye()[3]; // Point 39
    const rightEyeInner = landmarks.getRightEye()[0]; // Point 42

    const distLeft = Math.abs(noseTip.x - leftEyeInner.x);
    const distRight = Math.abs(noseTip.x - rightEyeInner.x);

    // Returns 0.5 when centered, > 0.5 when turned left (subject's left), < 0.5 when turned right
    return distLeft / (distLeft + distRight);
  };

  const checkBrightness = (video: HTMLVideoElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 50; canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 150;

    // Center crop: take middle 50% of the video
    // This prevents dark backgrounds from flagging "poor lighting" when the face is well-lit
    const sWidth = video.videoWidth * 0.5;
    const sHeight = video.videoHeight * 0.5;
    const sx = (video.videoWidth - sWidth) / 2;
    const sy = (video.videoHeight - sHeight) / 2;

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, 50, 50);

    const data = ctx.getImageData(0, 0, 50, 50).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return sum / (50 * 50);
  };

  const autoCaptureBurst = async (pose: 'front' | 'left' | 'right') => {
    if (isCapturingAuto || !videoRef.current) return;
    setIsCapturingAuto(true);

    // Play shutter sound
    playShutterSound();

    const burstCount = 2;
    const newFrames: { id: number, url: string, blob: Blob }[] = [];

    for (let i = 0; i < burstCount; i++) {
      // Visual flash
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 100);

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const url = canvas.toDataURL('image/jpeg', 0.98); // High quality
        const blob = await new Promise<Blob>(r => canvas.toBlob(b => r(b!), 'image/jpeg', 0.98));
        newFrames.push({ id: Date.now() + i, url, blob });
      }
      await new Promise(r => setTimeout(r, 200)); // Short gap between burst frames
    }

    setCapturedImages(prev => {
      // Safety check to prevent over-capturing
      if (prev.length >= TOTAL_CAPTURES) return prev;
      return [...prev, ...newFrames];
    });

    if (pose === 'front') setLivenessStep('left');
    else if (pose === 'left') setLivenessStep('right');
    else if (pose === 'right') setLivenessStep('done');

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

      // Normalization Step (Critical for L2/Cosine Match)
      const magnitude = Math.sqrt(averageEmbedding.reduce((sum, val) => sum + val * val, 0));
      if (magnitude > 0) {
        for (let i = 0; i < averageEmbedding.length; i++) {
          averageEmbedding[i] /= magnitude;
        }
        console.log(`📏 Normalized average embedding (Magnitude: ${magnitude.toFixed(4)} -> 1.0000)`);
      }

      const result = await completeFaceRegistration(user.id, averageEmbedding);
      if (result.success) {
        setStage('success');
        // Trigger backend sync so it knows about the new student immediately
        api.syncFaces();
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 overflow-x-hidden relative selection:bg-cyan-500/30">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-900/30 rounded-full blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] bg-indigo-900/20 rounded-full blur-[100px] animate-pulse delay-2000" />
      </div>

      <div className="w-full max-w-4xl z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* LEFT COLUMN: GUIDANCE & INFO */}
        <div className="space-y-8 order-2 lg:order-1 animate-slide-in-left">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest uppercase text-cyan-400">Secure Identity</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter bg-gradient-to-br from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
              Face ID Registration
            </h1>
            <p className="text-lg text-gray-400 font-medium leading-relaxed max-w-md">
              Secure your account using advanced biometric verification. It takes less than 30 seconds.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {[
              { icon: Camera, title: "Positioning", desc: "Center your face in the frame", active: stage === 'capturing' },
              { icon: Scan, title: "Liveness Check", desc: "Follow the movement prompts", active: stage === 'capturing' && livenessStep !== 'align' },
              { icon: ShieldCheck, title: "Secure Store", desc: "Encryption & mathematical hashing", active: stage === 'success' }
            ].map((item, idx) => (
              <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${item.active ? 'bg-white/5 border-white/20 shadow-xl scale-105' : 'bg-transparent border-transparent opacity-50'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.active ? 'bg-cyan-500 text-black' : 'bg-white/10 text-white'}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-bold ${item.active ? 'text-white' : 'text-gray-400'}`}>{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
                {item.active && <ChevronRight className="ml-auto w-5 h-5 text-cyan-500 animate-pulse" />}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN INTERFACE */}
        <div className="relative order-1 lg:order-2 animate-scale-in">
          {/* Main Glass Card */}
          <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 shadow-2xl overflow-hidden group hover:border-white/20 transition-all duration-500">

            {/* Header Status */}
            <div className="absolute top-8 left-0 right-0 z-20 text-center px-4">
              {stage === 'capturing' && (
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
                  <div className={`w-2 h-2 rounded-full bg-green-500`} />
                  <span className="text-xs font-bold tracking-wide uppercase text-white/90">
                    Camera Active
                  </span>
                </div>
              )}
            </div>

            {/* ERROR / SUCCESS OVERLAYS */}
            {stage === 'success' && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in text-center p-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-green-500/30 blur-[40px] rounded-full" />
                  <CheckCircle className="w-24 h-24 text-green-400 relative z-10 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                </div>
                <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Verified!</h2>
                <p className="text-gray-400 mb-8">Your face ID has been securely registered.</p>
                <Button onClick={handleComplete} className="w-full max-w-sm bg-white text-black hover:bg-gray-200 font-bold h-12 rounded-xl shadow-xl">
                  Continue to Dashboard
                </Button>
              </div>
            )}

            {stage === 'error' && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-6 text-center">
                <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Registration Failed</h2>
                <p className="text-sm text-gray-400 mb-6">We couldn't verify your face. Please try again in better lighting.</p>
                <Button onClick={handleRetry} className="bg-white/10 hover:bg-white/20 text-white border border-white/20">
                  Try Again
                </Button>
              </div>
            )}

            {/* VIDEO CONTAINER */}
            <div className={`relative aspect-[3/4] sm:aspect-[4/3] rounded-[2rem] overflow-hidden bg-gray-900 border border-white/5 shadow-inner ${stage === 'processing' ? 'opacity-50 blur-sm scale-95' : 'scale-100'} transition-all duration-500`}>

              {/* VIDEO ELEMENT */}
              {(stage === 'intro' || stage === 'capturing') && (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                  />
                  <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10" />

                  {/* UI OVERLAYS FOR CAMERA */}
                  <div className="absolute inset-0 pointer-events-none z-20">
                    {/* Modern Oval */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[65%] h-[55%] sm:w-[50%] sm:h-[65%] rounded-[50%] border-[3px] transition-all duration-300 backdrop-blur-[1px] ${facePosition ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'border-white/20'}`}>
                      {/* Scanning Line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_cyan] opacity-0 animate-scan-vertical"
                        style={{ animationDuration: '2s', animationIterationCount: 'infinite', opacity: facePosition ? 1 : 0 }} />

                      {/* Corner Markers */}
                      <div className="absolute top-4 left-0 w-0.5 h-6 bg-white/30" />
                      <div className="absolute top-0 left-4 w-6 h-0.5 bg-white/30" />
                      <div className="absolute top-4 right-0 w-0.5 h-6 bg-white/30" />
                      <div className="absolute top-0 right-4 w-6 h-0.5 bg-white/30" />
                    </div>

                    {/* Main Instruction Pill */}
                    {stage === 'capturing' && (
                      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
                        {/* Warning Toast */}
                        {/* Brightness warning temporarily disabled for testing */}
                        {false && (
                          <div className="flex items-center gap-2 bg-amber-500/90 text-black px-4 py-2 rounded-full font-bold text-xs shadow-lg animate-bounce">
                            <Sparkles className="w-3 h-3" /> Needs More Light
                          </div>
                        )}

                        {/* Main Prompt */}
                        <div className={`px-6 py-3 rounded-2xl font-bold text-lg shadow-2xl backdrop-blur-xl border transition-all duration-300 ${isCapturingAuto ? 'bg-green-500 text-black border-green-400 scale-110' :
                          distanceGuidance === 'too-far' ? 'bg-blue-500/90 text-white border-blue-400 animate-pulse' :
                            distanceGuidance === 'too-close' ? 'bg-orange-500/90 text-white border-orange-400 animate-pulse' :
                              facePosition ? 'bg-black/50 text-white border-white/20' : 'bg-white/10 text-white/60 border-transparent'
                          }`}>
                          {isCapturingAuto ? "Hold Still... 📸" :
                            brightness < 25 ? "Move to Light" :
                              distanceGuidance === 'too-far' ? "📏 Come Closer" :
                                distanceGuidance === 'too-close' ? "📏 Move Back" :
                                  livenessPrompts[livenessStep]}
                        </div>

                        {/* Progress Dots */}
                        <div className="flex gap-2">
                          {[0, 1, 2].map(i => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i < capturedImages.length / 2 ? 'bg-cyan-400 w-6' : 'bg-white/20'}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* LOADING STATE - INITIAL */}
              {stage === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin mb-4" />
                  <p className="text-cyan-500 font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Neural Net</p>
                </div>
              )}

              {/* PROCESSING STATE */}
              {stage === 'processing' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-30">
                  <div className="w-20 h-20 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_40px_rgba(34,211,238,0.2)]" />
                  <p className="mt-6 font-bold text-xl text-white tracking-tight animate-pulse">Analysing Biometrics...</p>
                </div>
              )}

              {/* INTRO START OVERLAY */}
              {stage === 'intro' && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <Button onClick={startCapture} size="lg" className="bg-white text-black hover:bg-gray-200 hover:scale-105 transition-all duration-300 h-16 px-10 rounded-full text-lg font-black shadow-[0_0_40px_rgba(255,255,255,0.3)] group" disabled={!modelsLoaded}>
                    <Scan className="w-6 h-6 mr-3 group-hover:rotate-12 transition-transform" />
                    Start Face Scan
                  </Button>
                </div>
              )}

            </div>

            {/* THUMBNAIL STRIP (Bottom) */}
            {capturedImages.length > 0 && stage !== 'success' && (
              <div className="mt-4 p-3 bg-white/5 border border-white/5 rounded-2xl flex gap-3 overflow-x-auto h-24 items-center px-4 custom-scrollbar">
                {capturedImages.map((img, i) => (
                  <div key={img.id} className="relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 border-white/20 hover:border-cyan-400 transition-all cursor-pointer">
                    <img src={img.url} className="w-full h-full object-cover scale-x-[-1]" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      onClick={() => removeImage(img.id)}>
                      <XCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ))}
                <div className="ml-auto text-xs text-right text-gray-500 font-mono">
                  {capturedImages.length} / {TOTAL_CAPTURES} <br /> FRAMES
                </div>
              </div>
            )}

            {/* Footer Action */}
            {stage === 'capturing' && livenessStep === 'done' && (
              <div className="absolute bottom-8 left-8 right-8 z-40 animate-slide-up">
                <Button onClick={handleScanAndSave} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white h-16 rounded-2xl text-xl font-bold border-0 shadow-[0_10px_40px_rgba(34,197,94,0.4)] transition-all transform hover:scale-[1.02] active:scale-[0.98]" disabled={isUploading}>
                  {isUploading ? <RefreshCw className="w-6 h-6 animate-spin mr-2" /> : <ShieldCheck className="w-6 h-6 mr-2" />}
                  Finish & Secure
                </Button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* CSS Animation Injection for Scan Line */}
      <style>{`
        @keyframes scan-vertical {
          0% { top: 10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan-vertical {
          animation-name: scan-vertical;
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
};

export default FaceRegistration;
