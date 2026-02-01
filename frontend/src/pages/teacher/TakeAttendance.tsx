import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Camera, CheckCircle, AlertCircle, RefreshCw, UserCheck, XCircle, FileUp, Layers, Users, Scan, ChevronRight, ArrowLeft, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as faceapi from 'face-api.js';

const TakeAttendance = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Steps: 'select' -> 'camera' -> 'verify' -> 'success'
    const [step, setStep] = useState<'select' | 'camera' | 'verify' | 'success'>('select');
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionCount, setSessionCount] = useState(0);
    const [sessionForDateExists, setSessionForDateExists] = useState(false);

    const [attendanceData, setAttendanceData] = useState<{ studentId: string; status: 'present' | 'absent'; name: string; student_id: string; confidence?: number }[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detectedCount, setDetectedCount] = useState(0);
    const [recognizedCount, setRecognizedCount] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);

    // Batch Capture State
    const [capturedImages, setCapturedImages] = useState<{ id: number, url: string, blob: Blob }[]>([]);
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [lastMatchedName, setLastMatchedName] = useState<string | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [backendStatus, setBackendStatus] = useState<'online' | 'error' | 'loading'>('online');
    const [activeTab, setActiveTab] = useState<'live' | 'manual'>('live'); // UI State for tabs

    const RECOGNITION_THRESHOLD = 0.2;

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionInterval = useRef<any>(null);
    const recognizedStudentsRef = useRef<Set<string>>(new Set());
    const allStudentsRef = useRef<any[]>([]);
    const autoStopTimer = useRef<NodeJS.Timeout | null>(null);

    // Load Models on mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelsLoaded(true);
                console.log('✅ TakeAttendance: Models loaded');
            } catch (e) {
                console.error("❌ TakeAttendance: Model loading error:", e);
                toast.error("Failed to load Face AI models");
            }
        };
        loadModels();

        // Auto-sync faces on mount
        api.syncFaces()
            .then(() => console.log("✅ Auto-synced faces on mount"))
            .catch(err => console.error("❌ Auto-sync failed", err));
    }, []);

    useEffect(() => {
        const fetchAssignments = async () => {
            if (authLoading || !user?.teacher_id) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const data = await api.getTeacherAssignments(user.teacher_id);
                setAssignments(data || []);
            } catch (e) {
                toast.error("Failed to load your assignments");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAssignments();
    }, [authLoading, user?.teacher_id]);

    useEffect(() => {
        const checkSessionLimitAndDuplicates = async () => {
            if (!selectedAssignmentId) {
                setSessionCount(0);
                setSessionForDateExists(false);
                return;
            }
            const assignment = assignments.find(a => a.id === selectedAssignmentId);
            if (!assignment) return;

            try {
                // 1. Check total session limit (25)
                const count = await api.getSessionCount(assignment.course_catalog_id, assignment.section_id);
                setSessionCount(count);
                if (count >= 25) {
                    toast.error(`Session limit reached (25/25) for this class.`);
                }

                // 2. Check if session already exists for SELECTED DATE
                const dateExists = await api.checkSessionExists(
                    assignment.course_catalog_id,
                    assignment.section_id,
                    attendanceDate
                );
                setSessionForDateExists(dateExists);
                if (dateExists) {
                    toast.warning(`Attendance already logged for this subject on ${attendanceDate}.`);
                }
            } catch (e) {
                console.error("Error checking session data:", e);
            }
        };
        checkSessionLimitAndDuplicates();
    }, [selectedAssignmentId, assignments, attendanceDate]);


    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

    // 📸 Camera Lifecycle Management
    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            if (step === 'camera') {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: facingMode, // Dynamic facing mode
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        videoRef.current.setAttribute('playsinline', 'true');
                        videoRef.current.play().catch(e => console.error("Video play error:", e));
                        setIsDetecting(true);
                    }
                } catch (err) {
                    console.error("Camera access error:", err);
                    toast.error("Could not access camera. Manual upload only.");
                    setIsDetecting(false);
                }
            }
        };

        if (step === 'camera') {
            startCamera();
        } else {
            stopDetectionLoop();
            setIsDetecting(false);
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [step, facingMode]); // Added facingMode to dependency array

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    // Add image to batch (from Upload)
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setCapturedImages(prev => [
                ...prev,
                { id: Date.now(), url: dataUrl, blob: file }
            ]);
            toast.success("Image added to batch");
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    // Capture current frame
    const captureFrameToBatch = async () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0);

        // Flash effect
        const flash = document.createElement('div');
        flash.className = "absolute inset-0 bg-white/50 z-50 transition-opacity duration-200 pointer-events-none";
        videoRef.current.parentElement?.appendChild(flash);
        setTimeout(() => flash.classList.add('opacity-0'), 50);
        setTimeout(() => flash.remove(), 250);

        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                setCapturedImages(prev => [...prev, { id: Date.now(), url, blob }]);
                toast.success("Frame captured");
                api.syncFaces().catch(console.error); // Auto sync on manual capture
            }
        }, 'image/jpeg', 0.85);
    };

    const removeImage = (id: number) => {
        setCapturedImages(prev => prev.filter(img => img.id !== id));
    };

    // Process Batch
    const processBatch = async () => {
        if (capturedImages.length === 0) {
            toast.warning("No images to process");
            return;
        }

        setIsProcessingBatch(true);
        setBackendStatus('loading');
        const uniqueRecognized = new Set<string>(recognizedStudentsRef.current);
        let totalDetected = 0;
        let newMatchesCount = 0;

        try {
            for (const img of capturedImages) {
                try {
                    const result = await api.recognizeFaces(img.blob);
                    setBackendStatus('online');
                    totalDetected += (result.detected_faces || 0);

                    if (result.matches && result.matches.length > 0) {
                        result.matches.forEach((match: any) => {
                            const studentId = String(match.student_id);
                            if (match.confidence >= RECOGNITION_THRESHOLD) {
                                if (!uniqueRecognized.has(studentId)) {
                                    uniqueRecognized.add(studentId);
                                    newMatchesCount++;
                                    const student = allStudentsRef.current.find(s => String(s.id) === studentId);
                                    if (student) {
                                        console.log(`✨ Batch Match: ${student.profile?.name}`);
                                    }
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.error("Batch error:", e);
                    setBackendStatus('error');
                    break;
                }
            }

            recognizedStudentsRef.current = uniqueRecognized;
            setRecognizedCount(uniqueRecognized.size);
            setDetectedCount(totalDetected);

            if (newMatchesCount > 0) {
                toast.success(`Found ${newMatchesCount} new students!`);
            } else if (totalDetected > 0) {
                toast.warning(`Detected ${totalDetected} faces but no confident matches.`);
            } else {
                toast.info("No faces detected in images.");
            }
        } catch (error) {
            toast.error("Error processing batch");
        } finally {
            setIsProcessingBatch(false);
        }
    };

    const finalizeAttendance = () => {
        if (autoStopTimer.current) {
            clearTimeout(autoStopTimer.current);
            autoStopTimer.current = null;
        }
        stopDetectionLoop();
        const recognized = recognizedStudentsRef.current;
        const students = allStudentsRef.current;

        const finalAttendance = students.map((s: any) => {
            const isPresent = recognized.has(String(s.id));
            return {
                studentId: s.id,
                name: s.profile?.name || "Unknown",
                student_id: s.student_id,
                status: isPresent ? 'present' as const : 'absent' as const,
                confidence: isPresent ? 0.95 : 0
            };
        });

        setAttendanceData(finalAttendance);
        setStep('verify');
    }

    const isScanningRef = useRef(false);
    const processingRef = useRef(false);

    // Optimized: Resize and capture frame
    const getFrameBlob = async (): Promise<Blob | null> => {
        if (!videoRef.current) return null;

        // Use a temporary canvas for resizing (Performance: 720p/800px width is sweet spot)
        const canvas = document.createElement('canvas');
        const video = videoRef.current;

        // Calculate dynamic height to maintain aspect ratio
        const targetWidth = 600;
        const scale = targetWidth / video.videoWidth;
        const targetHeight = video.videoHeight * scale;

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d', { alpha: false }); // Optimization: No alpha channel
        if (!ctx) return null;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

        // Convert to Blob (JPEG 0.70 quality is faster)
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.70));
    };

    const [fps, setFps] = useState(0);
    const [avgLatency, setAvgLatency] = useState(0);
    const [frameStatus, setFrameStatus] = useState("Ready");
    const frameTimes = useRef<number[]>([]);
    const frameIdCounter = useRef(0);

    const scanFrame = async () => {
        // 1. Check active state
        if (!isScanningRef.current || !videoRef.current || !videoReady) return;

        // 2. Concurrency Control
        if (processingRef.current) {
            setTimeout(scanFrame, 20); // Check faster
            return;
        }

        const startTime = performance.now();
        const currentFrameId = ++frameIdCounter.current;

        try {
            processingRef.current = true;
            setFrameStatus(`Frame #${currentFrameId}: 📸 Capturing...`);

            // 3. Capture Frame
            const blob = await getFrameBlob();
            if (!blob) throw new Error("Frame capture failed");

            // 4. Send to API
            setFrameStatus(`Frame #${currentFrameId}: ☁️ Sending...`);
            const result = await api.recognizeFaces(blob);
            setBackendStatus('online');

            const detected = result.detected_faces || 0;
            setDetectedCount(detected);
            setFrameStatus(`Frame #${currentFrameId}: ✅ Processed (${detected} faces)`);

            // 5. Process Matches
            if (result.matches && result.matches.length > 0) {
                let newMatches = 0;
                result.matches.forEach((match: any) => {
                    if (match.confidence >= RECOGNITION_THRESHOLD) {
                        const studentId = String(match.student_id);
                        if (!recognizedStudentsRef.current.has(studentId)) {
                            const student = allStudentsRef.current.find(s => String(s.id) === studentId);
                            if (student) {
                                recognizedStudentsRef.current.add(studentId);
                                newMatches++;
                                const name = student.profile?.name || "Unknown";
                                setLastMatchedName(`${name} (${(match.confidence * 100).toFixed(0)}%)`);
                                setTimeout(() => setLastMatchedName(null), 2000);
                            }
                        }
                    }
                });
                if (newMatches > 0) {
                    setRecognizedCount(recognizedStudentsRef.current.size);
                }
            }

            // 6. Auto-Stop
            if (detected > 0 && recognizedStudentsRef.current.size >= totalStudents && totalStudents > 0) {
                toast.success("All students identified!");
                finalizeAttendance();
                return;
            }

        } catch (e) {
            console.error("Scanning error:", e);
            setFrameStatus(`Frame #${currentFrameId}: ❌ Error`);
        } finally {
            processingRef.current = false;

            // Metrics Calculation
            const endTime = performance.now();
            const latency = endTime - startTime;
            setAvgLatency(prev => Math.round((prev * 0.9) + (latency * 0.1))); // Smooth Average

            const now = performance.now();
            const validTimes = frameTimes.current.filter(t => now - t < 1000);
            validTimes.push(now);
            frameTimes.current = validTimes;
            setFps(validTimes.length);
        }

        // 7. Loop
        if (isScanningRef.current) {
            setTimeout(scanFrame, 50);
        }
    };

    const visualLoopRef = useRef<number>(0);

    const startVisualTracking = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !isScanningRef.current) return;

        const loop = async () => {
            if (!isScanningRef.current) return;

            try {
                // Ensure video is playing and has dimensions
                if (video.readyState === 4 && video.videoWidth > 0) {
                    // Initial match dimensions if not set (or on resize)
                    const displaySize = { width: video.videoWidth, height: video.videoHeight };
                    if (canvas.width !== displaySize.width || canvas.height !== displaySize.height) {
                        faceapi.matchDimensions(canvas, displaySize);
                    }

                    // Fast detect for UI boxes - tuned for range
                    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
                        inputSize: 512,      // Higher = better distant face detection (default 224)
                        scoreThreshold: 0.3  // Lower = more sensitive
                    }));
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);

                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Custom Draw Loop
                        resizedDetections.forEach((det) => {
                            const box = det.box;

                            // 1. Draw Box (Green, rounded corners effect via line tracing)
                            ctx.strokeStyle = '#22c55e'; // Green-500
                            ctx.lineWidth = 3;
                            ctx.strokeRect(box.x, box.y, box.width, box.height);

                            // 2. Determine Label
                            // Heuristic: If 1 face & recent match -> Show Name. Else "Scanning"
                            let labelText = "Scanning...";
                            let labelColor = "#22c55e"; // Green

                            // We access the ref directly for the latest match name
                            // Note: This matches the singleton face assumption
                            if (resizedDetections.length === 1 && lastMatchedName) {
                                labelText = lastMatchedName.split('(')[0].trim();
                            }

                            // 3. Draw Label (Top Right Corner of Box)
                            const fontSize = 14;
                            ctx.font = `bold ${fontSize}px sans-serif`;
                            const textWidth = ctx.measureText(labelText).width;
                            const padding = 6;
                            const labelX = box.x + box.width - textWidth - (padding * 2); // Align right edge
                            const labelY = box.y - 25;

                            // Label Background
                            ctx.fillStyle = labelColor;
                            ctx.beginPath();
                            ctx.roundRect(labelX, labelY, textWidth + (padding * 2), 25, 4);
                            ctx.fill();

                            // Label Text
                            ctx.fillStyle = "#ffffff";
                            ctx.fillText(labelText, labelX + padding, labelY + 17);
                        });
                    }
                }
            } catch (e) {
                // Squelch errors in visual loop to avoid spam
            }

            if (isScanningRef.current) {
                visualLoopRef.current = requestAnimationFrame(loop);
            }
        };

        loop();
    };

    const initializeTracking = async (students: any[]) => {
        // Auto-Sync Trigger
        api.syncFaces().catch(e => console.error("Auto-sync failed", e));

        if (!videoRef.current) {
            toast.error("Camera not ready");
            return;
        }

        // Reset State
        setDetectedCount(0);
        setTotalStudents(students.length);
        setIsTracking(true);
        isScanningRef.current = true;
        processingRef.current = false;

        // Start the Loop
        console.log("🚀 Starting robust live scan...", { target: "5-6 FPS", resize: "800px" });
        scanFrame();

        // Start Visual Effects
        startVisualTracking();

        // Safety Timer: Stop after 45s (increased from 20s for better user experience)
        if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
        autoStopTimer.current = setTimeout(() => {
            if (isScanningRef.current) {
                toast.info("Session timeout. Reviewing results...");
                finalizeAttendance();
            }
        }, 45000);
    };

    const stopTracking = () => {
        console.log("🛑 Stopping scan");
        setIsTracking(false);
        isScanningRef.current = false;
        processingRef.current = false;

        // Stop Visual Loop
        if (visualLoopRef.current) {
            cancelAnimationFrame(visualLoopRef.current);
        }
        // Clear Canvas
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (autoStopTimer.current) {
            clearTimeout(autoStopTimer.current);
            autoStopTimer.current = null;
        }
    };

    const stopDetectionLoop = () => {
        stopTracking();
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(t => t.stop());
        }
    };

    const handleStartCamera = async () => {
        if (!selectedAssignmentId) return;

        // Auto-Sync Trigger
        api.syncFaces().then(() => console.log("📷 Camera Start: AI Synced"));

        try {
            setIsLoading(true);
            const assignment = assignments.find(a => a.id === selectedAssignmentId);
            const students = await api.getStudentsBySection(assignment.section_id);
            allStudentsRef.current = students;
            setTotalStudents(students.length);
            setRecognizedCount(0);
            recognizedStudentsRef.current = new Set();
            setCapturedImages([]);
            setBackendStatus('online');
            setStep('camera');
        } catch (e) {
            toast.error("Failed to load class roster");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAttendance = (studentId: string) => {
        setAttendanceData(prev => prev.map(record =>
            record.studentId === studentId
                ? { ...record, status: record.status === 'present' ? 'absent' : 'present' }
                : record
        ));
    };

    const handleSubmit = async () => {
        const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
        if (!selectedAssignment) return;
        setIsLoading(true);
        try {
            const logs = attendanceData.map(d => ({
                student_id: d.studentId,
                course_catalog_id: selectedAssignment.course_catalog_id,
                section_id: selectedAssignment.section_id,
                teacher_id: user.teacher_id,
                date: attendanceDate,
                status: d.status,
                confidence: d.status === 'present' ? 0.95 : 0
            }));
            const { error } = await api.logAttendance(logs);
            if (error) throw error;

            setStep('success');
            toast.success("Attendance saved!");
        } catch (e: any) {
            console.error("❌ Submission Error:", e);
            toast.error(e.message || "Failed to save attendance");
        } finally {
            setIsLoading(false);
        }
    };

    /* -------------------------------------------------------------------------- */
    /*                                 UI SECTIONS                                */
    /* -------------------------------------------------------------------------- */

    // 1. Selection Step
    if (step === 'select') {
        return (
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">New Session</h1>
                    <p className="text-slate-500">Select a class to take attendance.</p>
                </div>

                <Card className="bg-white border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-lg font-bold text-slate-800">Class Details</CardTitle>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary" onClick={() => api.syncFaces().then(() => toast.success("Synced"))}>
                                <RefreshCw className="w-4 h-4 mr-2" /> Sync AI
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        {!isLoading ? (
                            assignments.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label className="uppercase text-[10px] font-bold tracking-widest text-slate-400">Select Subject</Label>
                                        <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                            <SelectTrigger className="h-14 rounded-xl border-slate-200 bg-white text-base">
                                                <SelectValue placeholder="Choose a course..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                                {assignments.map(a => (
                                                    <SelectItem key={a.id} value={a.id} className="py-3">
                                                        <span className="font-bold text-slate-800">{a.course_catalog?.subject_name}</span>
                                                        <span className="ml-2 text-xs text-slate-400">({a.section?.batch?.name})</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {selectedAssignmentId && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                                            <div className="grid gap-2">
                                                <Label className="uppercase text-[10px] font-bold tracking-widest text-slate-400">Session Date</Label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        type="date"
                                                        value={attendanceDate}
                                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                                        className="h-14 pl-11 rounded-xl border-slate-200 bg-white text-base"
                                                    />
                                                </div>
                                            </div>

                                            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${sessionCount >= 25 ? 'bg-red-50 border-red-100' : 'bg-primary/5 border-primary/10'}`}>
                                                {sessionCount >= 25 ? (
                                                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                                ) : (
                                                    <Users className="w-5 h-5 text-primary mt-0.5" />
                                                )}
                                                <div>
                                                    <p className={`text-sm font-bold ${sessionCount >= 25 ? 'text-red-800' : 'text-slate-800'}`}>
                                                        {sessionCount >= 25 ? 'Limit Reached' : 'Session Status'}
                                                    </p>
                                                    <p className={`text-xs ${sessionCount >= 25 ? 'text-red-600' : 'text-slate-500'} mt-0.5`}>
                                                        {sessionCount >= 25
                                                            ? 'You have reached the maximum of 25 sessions for this class.'
                                                            : `This will be session ${sessionCount + 1} of 25.`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Layers className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <p className="text-slate-500 font-bold">No classes assigned.</p>
                                </div>
                            )
                        ) : (
                            <div className="space-y-4">
                                <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                                <div className="h-24 bg-slate-50 rounded-xl animate-pulse" />
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-6 pt-0 flex flex-col gap-4">
                        {sessionForDateExists && (
                            <div className="w-full flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl animate-in slide-in-from-bottom-2">
                                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                                <p className="text-sm font-semibold text-amber-800 text-left">
                                    Attendance has already been recorded for this subject on the selected date.
                                </p>
                            </div>
                        )}
                        <Button
                            className={`w-full h-14 text-lg font-bold rounded-xl shadow-lg ${(sessionCount >= 25 || sessionForDateExists) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'shadow-primary/20'}`}
                            onClick={handleStartCamera}
                            disabled={!selectedAssignmentId || isLoading || sessionCount >= 25 || sessionForDateExists}
                        >
                            <Camera className="mr-2 w-5 h-5" /> Launch Scanner
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // 2. Camera Step


    if (step === 'camera') {
        const isOnline = backendStatus === 'online';
        // Compute present students on the fly for display
        const presentStudentsList = allStudentsRef.current.filter(s => recognizedStudentsRef.current.has(String(s.id)));

        return (
            <div className="max-w-6xl mx-auto space-y-4 pb-20 animate-in zoom-in-95 duration-300">
                {/* Header Bar */}
                <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-sm sticky top-0 z-20">
                    <Button variant="ghost" size="sm" onClick={() => setStep('select')} className="text-slate-600 hover:bg-slate-100">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        <span className="hidden sm:inline font-bold">Back</span>
                    </Button>

                    <div className="flex items-center gap-2">
                        {/* Metrics - Compact on mobile */}
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">FPS</span>
                            <span className={`text-xs font-bold ${fps < 4 ? 'text-red-500' : 'text-green-600'}`}>{fps}</span>
                        </div>
                        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg ${isOnline ? 'bg-green-100' : 'bg-red-100'}`}>
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <Button variant="secondary" size="sm" onClick={toggleCamera} className="shadow-sm border border-slate-200">
                        <RefreshCw className="w-4 h-4 sm:mr-2" />
                        <span className="hidden sm:inline font-bold">Flip</span>
                    </Button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* LEFT COLUMN: Main Video Feed */}
                    <div className="xl:col-span-2 space-y-4">
                        <div className="relative aspect-[3/4] sm:aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl ring-4 ring-slate-100/50">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                onLoadedMetadata={() => setVideoReady(true)}
                                onPlay={() => setVideoReady(true)}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                            {/* HUD Overlay */}
                            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                                {/* Top Indicators */}
                                <div className="flex justify-between items-start">
                                    <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                                        <span className="text-white text-xs font-bold flex items-center gap-2">
                                            <Users className="w-3 h-3" />
                                            {detectedCount} Faces
                                        </span>
                                    </div>
                                    {isTracking && (
                                        <div className="bg-red-500/90 text-white text-[10px] font-black px-2 py-1 rounded animate-pulse">
                                            LIVE
                                        </div>
                                    )}
                                </div>

                                {/* Flash Notification */}
                                {lastMatchedName && (
                                    <div className="self-center bg-white/90 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-xl animate-in zoom-in slide-in-from-bottom-5">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-green-500 p-1.5 rounded-full">
                                                <CheckCircle className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-800">{lastMatchedName.split('(')[0]}</p>
                                                <p className="text-[10px] font-bold text-green-600 uppercase">Authenticated</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Scan Line Animation */}
                            {isTracking && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,1)] animate-[scan_2s_ease-in-out_infinite]" />
                            )}
                        </div>

                        {/* Status Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {isTracking ? (
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                                )}
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider truncate">
                                    {isTracking ? frameStatus : "Status: Idle"}
                                </p>
                            </div>
                            <Button
                                size="lg"
                                className={`rounded-xl font-black shadow-lg transition-all active:scale-95 ${isTracking
                                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20 text-white px-8'
                                    : 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20 text-white px-8'
                                    }`}
                                onClick={isTracking ? stopTracking : () => initializeTracking(allStudentsRef.current)}
                            >
                                {isTracking ? "STOP" : "START SCAN"}
                            </Button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Interactive Panel */}
                    <div className="flex flex-col h-[500px] xl:h-auto bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        {/* Custom Tabs Header */}
                        <div className="grid grid-cols-2 p-1.5 bg-slate-100/50 gap-1.5">
                            <button
                                onClick={() => setActiveTab('live')}
                                className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'live'
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Live List ({recognizedCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('manual')}
                                className={`py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeTab === 'manual'
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                Manual ({capturedImages.length})
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                            {activeTab === 'live' ? (
                                // Live List Content
                                <div className="space-y-3">
                                    {presentStudentsList.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40 mt-10">
                                            <Scan className="w-12 h-12 mb-3" />
                                            <p className="text-sm font-bold">Waiting for students...</p>
                                        </div>
                                    ) : (
                                        presentStudentsList.map((student, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-green-50/50 border border-green-100 rounded-xl animate-in slide-in-from-left-2 duration-300">
                                                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                                                    {student.profile?.name?.[0] || "?"}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 truncate">{student.profile?.name}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{student.student_id}</p>
                                                </div>
                                                <CheckCircle className="w-4 h-4 text-green-500 ml-auto shrink-0" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                // Manual Capture Content
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2">
                                        {capturedImages.map(img => (
                                            <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group">
                                                <img src={img.url} className="w-full h-full object-cover" />
                                                <button onClick={() => removeImage(img.id)} className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <XCircle className="text-white w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all"
                                            onClick={captureFrameToBatch}
                                        >
                                            <Camera className="w-6 h-6 mb-1" />
                                            <span className="text-[10px] font-bold uppercase">Snap</span>
                                        </button>
                                    </div>
                                    <div className="pt-2">
                                        <div className="relative mb-2">
                                            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} />
                                            <Button variant="outline" className="w-full rounded-xl border-slate-200 h-10 text-sm">
                                                <FileUp className="w-4 h-4 mr-2" /> Upload
                                            </Button>
                                        </div>
                                        <Button
                                            className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 h-10 text-sm"
                                            disabled={capturedImages.length === 0 || isProcessingBatch}
                                            onClick={processBatch}
                                        >
                                            {isProcessingBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Process Queue'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100">
                            <Button
                                className="w-full h-12 rounded-xl text-lg font-bold shadow-sm"
                                onClick={finalizeAttendance}
                            >
                                Review & Submit <ArrowLeft className="ml-2 w-4 h-4 rotate-180" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Verify Step
    if (step === 'verify') {
        const stats = {
            present: attendanceData.filter(d => d.status === 'present').length,
            absent: attendanceData.filter(d => d.status === 'absent').length
        };

        return (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">Summary</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-slate-500 text-sm">Attendance for</span>
                            <div className="relative inline-block">
                                <input
                                    type="date"
                                    value={attendanceDate}
                                    onChange={(e) => setAttendanceDate(e.target.value)}
                                    className="text-primary font-bold bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:underline"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="px-4 py-2 bg-green-50 rounded-xl border border-green-100">
                            <span className="block text-[10px] font-bold text-green-600 uppercase tracking-widest">Present</span>
                            <span className="text-2xl font-black text-green-700">{stats.present}</span>
                        </div>
                        <div className="px-4 py-2 bg-red-50 rounded-xl border border-red-100">
                            <span className="block text-[10px] font-bold text-red-600 uppercase tracking-widest">Absent</span>
                            <span className="text-2xl font-black text-red-700">{stats.absent}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {attendanceData.map((student) => (
                        <div
                            key={student.studentId}
                            onClick={() => toggleAttendance(student.studentId)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${student.status === 'present'
                                ? 'bg-white border-green-200 shadow-sm hover:border-green-300'
                                : 'bg-slate-50 border-slate-100 opacity-60 hover:opacity-100 hover:bg-white'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${student.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {student.name.charAt(0)}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-bold text-slate-800 truncate">{student.name}</p>
                                    <p className="text-xs text-slate-400">{student.student_id}</p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${student.status === 'present' ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                                {student.status === 'present' && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4 pt-4 border-t border-slate-100">
                    <Button variant="outline" className="flex-1 h-14 rounded-xl text-slate-500 font-bold" onClick={() => setStep('camera')}>
                        Resume Scanning
                    </Button>
                    <Button className="flex-[2] h-14 rounded-xl font-bold text-lg shadow-lg shadow-primary/20" onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? "Submitting..." : "Confirm & Save Attendance"}
                    </Button>
                </div>
            </div>
        );
    }

    // 4. Success Step
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center shadow-xl shadow-green-100/50">
                <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div>
                <h1 className="text-3xl font-black text-slate-900">Attendance Recorded!</h1>
                <p className="text-slate-500 mt-2">The session has been successfully logged.</p>
            </div>
            <div className="flex gap-4">
                <Button variant="outline" className="rounded-xl font-bold" onClick={() => navigate('/teacher/dashboard')}>
                    Back to Dashboard
                </Button>
                <Button className="rounded-xl font-bold" onClick={() => setStep('select')}>
                    Start New Class
                </Button>
            </div>
        </div>
    );
};

export default TakeAttendance;
