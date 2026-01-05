import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, CheckCircle, AlertCircle, RefreshCw, UserCheck, XCircle, FileUp, Layers, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as faceapi from 'face-api.js';
import { useRef } from "react";

const TakeAttendance = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Steps: 'select' -> 'camera' -> 'verify' -> 'success'
    const [step, setStep] = useState<'select' | 'camera' | 'verify' | 'success'>('select');
    const [assignments, setAssignments] = useState<any[]>([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

    const [attendanceData, setAttendanceData] = useState<{ studentId: string; status: 'present' | 'absent'; name: string; student_id: string }[]>([]);
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
    const [backendStatus, setBackendStatus] = useState<'online' | 'error' | 'loading'>('online');

    // Recognition Config
    const RECOGNITION_THRESHOLD = 0.5; // Ignore matches below 50% confidence (aligns with backend tolerance 0.6)

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const detectionInterval = useRef<any>(null);

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

    // Not used anymore - recognition done on backend
    // Kept for reference
    // Kept for reference
    const MATCH_THRESHOLD = 0.6;
    const recognizedStudentsRef = useRef<Set<string>>(new Set());
    const knownEmbeddingsRef = useRef<Record<string, number[]>>({}); // Deprecated but kept to avoid breaking other logic temporarily


    // 📸 Camera Lifecycle Management
    useEffect(() => {
        let stream: MediaStream | null = null;

        const startCamera = async () => {
            if (step === 'camera') {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
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
    }, [step]);

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

        // Reset input
        event.target.value = '';
    };

    // Capture current frame and add to batch
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
        flash.className = "absolute inset-0 bg-white/50 z-50 transition-opacity duration-200";
        videoRef.current.parentElement?.appendChild(flash);
        setTimeout(() => flash.classList.add('opacity-0'), 50);
        setTimeout(() => flash.remove(), 250);

        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                setCapturedImages(prev => [...prev, { id: Date.now(), url, blob }]);
                toast.success("Frame captured");
            }
        }, 'image/jpeg', 0.8);
    };

    const removeImage = (id: number) => {
        setCapturedImages(prev => prev.filter(img => img.id !== id));
    };

    // Process ALL images in the batch
    const processBatch = async () => {
        if (capturedImages.length === 0) {
            toast.warning("No images to process");
            return;
        }

        setIsProcessingBatch(true);
        setBackendStatus('loading');
        const uniqueRecognized = new Set<string>(recognizedStudentsRef.current); // Start with existing
        let totalDetected = 0;
        let newMatchesCount = 0;

        try {
            toast.info(`Processing batch of ${capturedImages.length} images...`);

            for (const img of capturedImages) {
                try {
                    const result = await api.recognizeFaces(img.blob);
                    setBackendStatus('online'); // Connection successful
                    totalDetected += (result.detected_faces || 0);

                    if (result.matches && result.matches.length > 0) {
                        result.matches.forEach((match: any) => {
                            const studentId = String(match.student_id);
                            if (match.confidence >= RECOGNITION_THRESHOLD) {
                                if (!uniqueRecognized.has(studentId)) {
                                    uniqueRecognized.add(studentId);
                                    newMatchesCount++;

                                    // Identify student name for logs/feedback
                                    const student = allStudentsRef.current.find(s => String(s.id) === studentId);
                                    if (student) {
                                        console.log(`✨ Batch Match: ${student.profile?.name} (${(match.confidence * 100).toFixed(1)}%)`);
                                    }
                                }
                            } else {
                                console.warn(`⚠️ Match ignored due to low confidence: ${match.student_id} (${(match.confidence * 100).toFixed(1)}%)`);
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error processing batch image:", e);
                    setBackendStatus('error');
                    toast.error("AI Server connection interrupted.");
                    break;
                }
            }

            // Update Global State
            recognizedStudentsRef.current = uniqueRecognized;
            setRecognizedCount(uniqueRecognized.size);
            setDetectedCount(totalDetected); // Shows total faces seen across all images

            if (newMatchesCount > 0) {
                toast.success(`Match successfully found! ${newMatchesCount} new student(s) recognized.`);
            } else if (totalDetected > 0) {
                toast.warning(`Detected ${totalDetected} face(s), but no confident matches were found. Try another angle or better lighting.`);
            } else {
                toast.info("Processing complete. No faces detected in these images.");
            }

        } catch (error) {
            toast.error("Error processing batch");
        } finally {
            setIsProcessingBatch(false);
        }
    };

    // New Ref to store students for final mapping
    const allStudentsRef = useRef<any[]>([]);

    const finalizeAttendance = () => {
        stopDetectionLoop();
        const recognized = recognizedStudentsRef.current;
        const students = allStudentsRef.current;

        console.log(`📊 Recognition complete: ${recognized.size}/${students.length} students recognized`);

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

        if (recognized.size === 0) {
            toast.error("Scanning complete, but no students were recognized. Please review manually.");
        } else {
            toast.success(`Scanning complete! ${recognized.size} of ${students.length} students were successfully identified.`);
        }
    }

    const initializeTracking = (students: any[]) => {
        if (!videoRef.current) {
            toast.error("Camera not ready for tracking");
            return;
        }

        setDetectedCount(0);
        setTotalStudents(students.length);

        // DO NOT reset recognizedStudentsRef.current here. 
        // This allows combined Live + Upload results.

        setCapturedImages(prev => prev); // Trigger re-render if needed

        // Filter students with valid embeddings
        const studentsWithEmbeddings = students.filter(s => {
            if (!s.face_embedding) return false;
            try {
                const embedding = typeof s.face_embedding === 'string'
                    ? JSON.parse(s.face_embedding)
                    : s.face_embedding;
                return Array.isArray(embedding) && embedding.length > 0;
            } catch {
                return false;
            }
        });

        console.log(`🔍 Starting recognition with ${studentsWithEmbeddings.length}/${students.length} students having embeddings`);

        // knownEmbeddings not needed for server-side recognition
        // knownEmbeddingsRef.current = knownEmbeddings;
        setIsTracking(true);

        detectionInterval.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) return;

            try {
                // Capture current video frame
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.drawImage(videoRef.current, 0, 0);

                // Convert to blob
                const blob = await new Promise<Blob | null>((resolve) => {
                    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.8);
                });

                if (!blob) {
                    console.warn("⚠️ Could not capture frame blob, skipping...");
                    return;
                }

                // Send to Python backend for recognition
                const result = await api.recognizeFaces(blob);
                setBackendStatus('online'); // Connection verified

                setDetectedCount(result.detected_faces || 0);

                // Update recognized students
                if (result.matches && result.matches.length > 0) {
                    result.matches.forEach((match: any) => {
                        if (match.confidence >= RECOGNITION_THRESHOLD) {
                            const studentId = String(match.student_id);
                            if (!recognizedStudentsRef.current.has(studentId)) {
                                const student = allStudentsRef.current.find(s => String(s.id) === studentId);
                                const studentName = student?.profile?.name || "Unknown Student";
                                const confidencePercent = (match.confidence * 100).toFixed(1);

                                console.log(`✅ Matched: ${studentName} (${confidencePercent}%)`);
                                recognizedStudentsRef.current.add(studentId);

                                // Provide visual feedback for the match
                                setLastMatchedName(`${studentName} (${confidencePercent}%)`);
                                setTimeout(() => setLastMatchedName(null), 3000); // Clear after 3s
                            }
                        }
                    });
                    setRecognizedCount(recognizedStudentsRef.current.size);
                }

                // Optional: Draw detection boxes using face-api.js for visual feedback
                if (modelsLoaded && canvasRef.current && videoRef.current) {
                    const detections = await faceapi.detectAllFaces(
                        videoRef.current,
                        new faceapi.TinyFaceDetectorOptions()
                    );
                    const displaySize = { width: videoRef.current.offsetWidth, height: videoRef.current.offsetHeight };
                    faceapi.matchDimensions(canvasRef.current, displaySize);
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    canvasRef.current.getContext('2d')?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
                }
            } catch (e) {
                console.error('Detection error:', e);
                setBackendStatus('error');
                stopTracking(); // Pause on connection error
                toast.error("AI Server connection lost. Please check your internet or retry.");
            }
        }, 800); // Slightly slower interval for stability

        // Auto-complete timeout REMOVED to allow manual batch processing
    };

    const stopTracking = () => {
        setIsTracking(false);
        if (detectionInterval.current) {
            clearInterval(detectionInterval.current);
            detectionInterval.current = null;
        }
    };

    const stopDetectionLoop = () => {
        stopTracking();
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleStartCamera = async () => {
        if (!selectedAssignmentId) {
            toast.error("Please select an assignment first");
            return;
        }

        try {
            setIsLoading(true);

            // 1. Get Students & Data
            const assignment = assignments.find(a => a.id === selectedAssignmentId);
            const students = await api.getStudentsBySection(assignment.section_id);
            allStudentsRef.current = students;
            setTotalStudents(students.length);

            // Reset state for NEW session
            setRecognizedCount(0);
            recognizedStudentsRef.current = new Set();
            setCapturedImages([]);
            setBackendStatus('online');

            // Build initial embeddings list
            const studentsWithEmbeddings = students.filter(s => {
                if (!s.face_embedding) return false;
                try {
                    const embedding = typeof s.face_embedding === 'string' ? JSON.parse(s.face_embedding) : s.face_embedding;
                    return Array.isArray(embedding) && embedding.length > 0;
                } catch { return false; }
            });

            // knownEmbeddings calculation removed - handled by backend


            // 2. Switch to Camera Step (useEffect will start the hardware)
            setStep('camera');
            setIsLoading(false);
        } catch (e) {
            console.error("Initialization error:", e);
            toast.error("Failed to load students");
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
                routine_id: null, // No specific routine matches manual session
                course_catalog_id: selectedAssignment.course_catalog_id,
                section_id: selectedAssignment.section_id,
                teacher_id: user.teacher_id,
                date: new Date().toISOString().split('T')[0],
                status: d.status,
                confidence: d.status === 'present' ? 0.95 : 0
            }));

            await api.logAttendance(logs);
            setStep('success');
            toast.success("Attendance submitted successfully");
        } catch (e) {
            toast.error("Failed to save attendance");
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setStep('select');
        setSelectedAssignmentId("");
        setAttendanceData([]);
    };

    if (step === 'select') {
        return (
            <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Take Attendance</h1>
                    <p className="text-muted-foreground">Select a class to start taking attendance.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Select Class</CardTitle>
                        <CardDescription>
                            Choose from your assigned subjects.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!isLoading ? (
                            assignments.length > 0 ? (
                                <div className="grid gap-2">
                                    <Label>Your Assignments</Label>
                                    <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a subject" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assignments.map(a => (
                                                <SelectItem key={a.id} value={a.id}>
                                                    <div className="flex flex-col text-left">
                                                        <span className="font-medium">{a.course_catalog?.subject_name}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {a.section?.batch?.name} • Section {a.section?.name}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {selectedAssignmentId && (() => {
                                        const selected = assignments.find(a => a.id === selectedAssignmentId);
                                        return selected ? (
                                            <div className="text-sm bg-muted p-3 rounded-md space-y-1">
                                                <div className="font-semibold">{selected.course_catalog?.subject_name}</div>
                                                <div className="text-muted-foreground">
                                                    Code: {selected.course_catalog?.subject_code}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {selected.section?.batch?.name} - Section {selected.section?.name}
                                                </div>
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No assignments found.</p>
                                    <p className="text-sm mt-2">Please add assignments in the "Classes" page first.</p>
                                </div>
                            )
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">Loading assignments...</div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button
                            className="w-full"
                            onClick={handleStartCamera}
                            disabled={!selectedAssignmentId || isLoading || assignments.length === 0}
                        >
                            <Camera className="mr-2 h-4 w-4" />
                            {isLoading ? "Loading..." : "Start Camera"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (step === 'camera') {
        const backendColor = backendStatus === 'online' ? 'bg-green-500' : backendStatus === 'loading' ? 'bg-yellow-500' : 'bg-red-500';
        const backendText = backendStatus === 'online' ? 'AI Server: Online' : backendStatus === 'loading' ? 'AI Server: Processing...' : 'AI Server: Error';

        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Attendance Session</h1>
                        <p className="text-muted-foreground text-sm">Preview mode is active. Start tracking to begin identification.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
                        <div className={`w-2 h-2 rounded-full ${backendColor} ${backendStatus === 'loading' ? 'animate-pulse' : ''}`} />
                        <span className="text-xs font-medium">{backendText}</span>
                    </div>
                </div>

                {/* Video & Tracking UI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-border shadow-xl ring-1 ring-black/5">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                            />
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                            {/* Tracking Active Indicator */}
                            {isTracking && (
                                <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/90 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest animate-pulse border border-white/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    Tracking Active
                                </div>
                            )}

                            {/* Match Overlay */}
                            {lastMatchedName && (
                                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 animate-in fade-in zoom-in duration-300 z-10">
                                    <div className="bg-green-600/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20">
                                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                            <UserCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase opacity-70 font-bold text-center">Recognized</div>
                                            <div className="font-black text-lg leading-tight text-center">{lastMatchedName}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                <div className="flex items-center justify-between text-white">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                                            <span className="font-mono text-xs uppercase tracking-widest font-bold">Camera {isDetecting ? 'On' : 'Off'}</span>
                                        </div>
                                        {detectedCount > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-500/20 backdrop-blur-md border border-blue-400/30">
                                                <Users className="w-3.5 h-3.5 text-blue-400" />
                                                <span className="text-sm font-mono font-bold">{detectedCount} Seen</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] uppercase opacity-60 font-bold">Progress</span>
                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                                                <span className="font-black text-lg">{recognizedCount}</span>
                                                <span className="opacity-40">/</span>
                                                <span className="opacity-60">{totalStudents}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Primary Action Button - START TRACKING */}
                        <Button
                            size="lg"
                            className={`w-full py-8 text-xl font-black rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl ${isTracking ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
                            onClick={isTracking ? stopTracking : () => initializeTracking(allStudentsRef.current)}
                        >
                            {isTracking ? (
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-6 h-6" /> Stop Recognition
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Camera className="w-6 h-6" /> Start Live Tracking
                                </div>
                            )}
                        </Button>
                    </div>

                    {/* Controls Sidebar */}
                    <div className="space-y-4">
                        <Card className="border-border/50 bg-card/50">
                            <CardHeader className="pb-3 px-4">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Snapshot & Upload</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 px-4 pb-4">
                                <div className="grid grid-cols-1 gap-2">
                                    <Button variant="outline" className="h-12 border-dashed border-2 hover:bg-muted" onClick={captureFrameToBatch}>
                                        <Camera className="w-4 h-4 mr-2 text-primary" />
                                        Capture Frame
                                    </Button>
                                    <div className="relative">
                                        <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                                        <Button variant="outline" className="w-full h-12 border-dashed border-2 hover:bg-muted">
                                            <FileUp className="w-4 h-4 mr-2 text-blue-500" />
                                            Upload Photo
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-border/50 bg-card/50">
                            <CardHeader className="pb-3 px-4">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pending Queue</CardTitle>
                                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">{capturedImages.length}</span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 px-4 pb-4">
                                {capturedImages.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-2">
                                        {capturedImages.slice(0, 8).map((img) => (
                                            <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                                                <img src={img.url} className="w-full h-full object-cover" />
                                                <button onClick={() => removeImage(img.id)} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                    <XCircle className="text-white w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {capturedImages.length > 8 && (
                                            <div className="flex items-center justify-center bg-muted rounded-lg text-[10px] font-bold">+{capturedImages.length - 8}</div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-[10px] text-muted-foreground border-2 border-dashed rounded-xl">No pending images</div>
                                )}

                                <Button
                                    className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold shadow-green-500/20 shadow-lg"
                                    disabled={isProcessingBatch || capturedImages.length === 0}
                                    onClick={processBatch}
                                >
                                    {isProcessingBatch ? <RefreshCw className="animate-spin mr-2 w-5 h-5" /> : <Layers className="mr-2 w-5 h-5" />}
                                    Run Processing
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="pt-2">
                            <Button
                                variant="secondary"
                                className="w-full h-12 text-sm font-semibold"
                                onClick={finalizeAttendance}
                            >
                                Finish & Verify
                                <UserCheck className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 'verify') {
        const stats = {
            present: attendanceData.filter(d => d.status === 'present').length,
            absent: attendanceData.filter(d => d.status === 'absent').length,
            total: attendanceData.length
        };

        return (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Verify Attendance</h1>
                        <p className="text-muted-foreground">Review and modify the detected attendance.</p>
                    </div>
                    <div className="flex gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500" />
                            <span>Present: {stats.present}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-destructive" />
                            <span>Absent: {stats.absent}</span>
                        </div>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <div className="border rounded-md">
                            <div className="grid grid-cols-4 p-4 font-medium border-b bg-muted/50">
                                <div>Student ID</div>
                                <div className="col-span-2">Name</div>
                                <div className="text-right">Status</div>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto divide-y">
                                {attendanceData.map((record) => (
                                    <div key={record.studentId} className="grid grid-cols-4 p-4 items-center hover:bg-muted/50">
                                        <div className="font-mono text-sm">{record.student_id}</div>
                                        <div className="col-span-2">{record.name}</div>
                                        <div className="flex justify-end items-center gap-2">
                                            <span className={`text-xs font-medium ${record.status === 'present' ? 'text-green-600' : 'text-destructive'}`}>
                                                {record.status.toUpperCase()}
                                            </span>
                                            <Switch
                                                checked={record.status === 'present'}
                                                onCheckedChange={() => toggleAttendance(record.studentId)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between p-6">
                        <Button variant="outline" onClick={() => setStep('select')}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                            {isLoading ? "Saving..." : "Confirm & Save"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    // Success Step
    return (
        <div className="max-w-md mx-auto text-center space-y-6 pt-12">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-green-600 dark:text-green-400">Attendance Saved!</h1>
                <p className="text-muted-foreground">
                    The attendance session has been successfully recorded.
                </p>
            </div>
            <div className="flex flex-col gap-2 pt-4">
                <Button onClick={reset}>Take Another Class</Button>
                <Button variant="outline" onClick={() => navigate('/teacher/dashboard')}>
                    Return to Dashboard
                </Button>
            </div>
        </div>
    );
};

export default TakeAttendance;
