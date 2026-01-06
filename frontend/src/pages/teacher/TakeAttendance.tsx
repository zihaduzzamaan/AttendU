import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Camera, CheckCircle, AlertCircle, RefreshCw, UserCheck, XCircle, FileUp, Layers, Users, Scan, ChevronRight, ArrowLeft } from "lucide-react";
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
    const [backendStatus, setBackendStatus] = useState<'online' | 'error' | 'loading'>('online');

    const RECOGNITION_THRESHOLD = 0.1;

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


    // 📸 Camera Lifecycle Management
    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            if (step === 'camera') {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment', // Prefer back camera on mobile
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }
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

    const initializeTracking = (students: any[]) => {
        if (!videoRef.current) {
            toast.error("Camera not ready");
            return;
        }
        setDetectedCount(0);
        setTotalStudents(students.length);
        setIsTracking(true);

        if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
        autoStopTimer.current = setTimeout(() => {
            toast.info("Auto-stopped after 20s");
            finalizeAttendance();
        }, 20000);

        detectionInterval.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) return;
            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.drawImage(videoRef.current, 0, 0);

                const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.8));
                if (!blob) return;

                const result = await api.recognizeFaces(blob);
                setBackendStatus('online');
                const detected = result.detected_faces || 0;
                setDetectedCount(detected);

                if (result.matches?.length > 0) {
                    result.matches.forEach((match: any) => {
                        if (match.confidence >= RECOGNITION_THRESHOLD) {
                            const studentId = String(match.student_id);
                            if (!recognizedStudentsRef.current.has(studentId)) {
                                const student = allStudentsRef.current.find(s => String(s.id) === studentId);
                                const name = student?.profile?.name || "Unknown";
                                recognizedStudentsRef.current.add(studentId);
                                setLastMatchedName(`${name} (${(match.confidence * 100).toFixed(0)}%)`);
                                setTimeout(() => setLastMatchedName(null), 3000);
                            }
                        }
                    });
                    setRecognizedCount(recognizedStudentsRef.current.size);
                }

                if (detected > 0 && recognizedStudentsRef.current.size >= detected) {
                    if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
                    toast.success("All visible faces recognized!");
                    finalizeAttendance();
                }
            } catch (e) {
                console.error(e);
                setBackendStatus('error');
            }
        }, 800);
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
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
    };

    const handleStartCamera = async () => {
        if (!selectedAssignmentId) return;
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
                date: new Date().toISOString().split('T')[0],
                status: d.status,
                confidence: d.status === 'present' ? 0.95 : 0
            }));
            await api.logAttendance(logs);
            setStep('success');
            toast.success("Attendance saved!");
        } catch (e) {
            toast.error("Network error");
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
                                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
                                            <Users className="w-5 h-5 text-primary mt-0.5" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">Ready to Start</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Prepare the camera to scan students.</p>
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
                    <CardFooter className="p-6 pt-0">
                        <Button
                            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/20"
                            onClick={handleStartCamera}
                            disabled={!selectedAssignmentId || isLoading}
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
        return (
            <div className="max-w-5xl mx-auto space-y-4 pb-28 lg:pb-6 animate-in hover:fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setStep('select')} className="text-slate-500 hover:text-slate-900 -ml-2">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`border-none ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} font-bold uppercase tracking-wider text-[10px]`}>
                            {isOnline ? 'AI Connected' : 'AI Offline'}
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
                    {/* Main Camera Feed */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="relative min-h-[70vh] lg:h-[calc(100vh-200px)] bg-black rounded-3xl overflow-hidden shadow-2xl shadow-slate-200 border border-slate-900/10">
                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                            {/* Visual Overlays */}
                            <div className="absolute inset-0 pointer-events-none">
                                {/* Corners */}
                                <div className="absolute top-6 left-6 w-12 h-12 border-l-4 border-t-4 border-white/50 rounded-tl-2xl" />
                                <div className="absolute top-6 right-6 w-12 h-12 border-r-4 border-t-4 border-white/50 rounded-tr-2xl" />
                                <div className="absolute bottom-6 left-6 w-12 h-12 border-l-4 border-b-4 border-white/50 rounded-bl-2xl" />
                                <div className="absolute bottom-6 right-6 w-12 h-12 border-r-4 border-b-4 border-white/50 rounded-br-2xl" />

                                {/* Scan Line */}
                                {isTracking && (
                                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.8)] animate-[scan_3s_ease-in-out_infinite]" />
                                )}

                                {/* Status Overlay */}
                                <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                                    <div>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Detected Faces</p>
                                        <p className="text-3xl font-black text-white">{detectedCount}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Identified</p>
                                        <p className="text-3xl font-black text-green-400">{recognizedCount} <span className="text-lg text-white/40">/ {totalStudents}</span></p>
                                    </div>
                                </div>

                                {/* Flash Match Overlay */}
                                {lastMatchedName && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-2xl animate-in zoom-in fade-in slide-in-from-bottom-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                                <CheckCircle className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{lastMatchedName.split('(')[0]}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirmed</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Primary Action */}
                        <Button
                            className={`h-16 lg:h-20 w-full rounded-2xl text-lg lg:text-xl font-black shadow-lg transition-all ${isTracking ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                            onClick={isTracking ? stopTracking : () => initializeTracking(allStudentsRef.current)}
                        >
                            {isTracking ? (
                                <><XCircle className="w-5 h-5 lg:w-6 lg:h-6 mr-2" /> Stop Scanning</>
                            ) : (
                                <><Scan className="w-5 h-5 lg:w-6 lg:h-6 mr-2" /> Start Scanning</>
                            )}
                        </Button>
                    </div>

                    {/* Sidebar Controls */}
                    <div className="flex flex-col gap-4">
                        <Card className="bg-white border-none shadow-sm rounded-3xl flex-1 flex flex-col overflow-hidden">
                            <CardHeader className="bg-slate-50/50 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Capture Queue</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 p-4 overflow-y-auto">
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
                            </CardContent>
                            <div className="p-4 border-t border-slate-100 space-y-2">
                                <div className="relative">
                                    <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileUpload} />
                                    <Button variant="outline" className="w-full rounded-xl border-slate-200">
                                        <FileUp className="w-4 h-4 mr-2" /> Upload Photo
                                    </Button>
                                </div>
                                <Button
                                    className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                                    disabled={capturedImages.length === 0 || isProcessingBatch}
                                    onClick={processBatch}
                                >
                                    {isProcessingBatch ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Process Queue'}
                                </Button>
                            </div>
                        </Card>

                        <Button
                            variant="secondary"
                            className="h-14 rounded-2xl bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 font-bold shadow-sm"
                            onClick={finalizeAttendance}
                        >
                            Review & Submit <ArrowLeft className="ml-2 w-4 h-4 rotate-180" />
                        </Button>
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
                        <p className="text-slate-500">Review attendance before submitting.</p>
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
