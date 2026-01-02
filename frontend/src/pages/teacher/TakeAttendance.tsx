import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Camera, CheckCircle, AlertCircle, RefreshCw, UserCheck, XCircle, FileUp, Layers } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as faceapi from 'face-api.js';
import { useRef } from "react";

const TakeAttendance = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Steps: 'select' -> 'camera' -> 'verify' -> 'success'
    const [step, setStep] = useState<'select' | 'camera' | 'verify' | 'success'>('select');
    const [routines, setRoutines] = useState<any[]>([]);
    const [selectedRoutineId, setSelectedRoutineId] = useState("");
    const [faculties, setFaculties] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    const [selectedFacultyId, setSelectedFacultyId] = useState("");
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

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

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];

    useEffect(() => {
        const fetchStructure = async () => {
            if (authLoading) return;
            setIsLoading(true);
            try {
                const [f, b, s, sub] = await Promise.all([
                    api.getFaculties(),
                    api.getBatches(),
                    api.getSections(),
                    api.getSubjects()
                ]);
                setFaculties(f);
                setBatches(b);
                setSections(s);
                setSubjects(sub);
            } catch (e) {
                toast.error("Failed to load department structure");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStructure();
    }, [authLoading]);

    const filteredBatches = batches.filter(b => b.faculty_id === selectedFacultyId);
    const filteredSections = sections.filter(s => s.batch_id === selectedBatchId);
    const filteredSubjects = subjects.filter(sub => sub.section_id === selectedSectionId);

    // Not used anymore - recognition done on backend
    // Kept for reference
    // Kept for reference
    const MATCH_THRESHOLD = 0.6;
    const recognizedStudentsRef = useRef<Set<string>>(new Set());
    const knownEmbeddingsRef = useRef<Record<string, number[]>>({});

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
        const uniqueRecognized = new Set<string>(recognizedStudentsRef.current); // Start with existing
        let totalDetected = 0;
        let newMatchesCount = 0;

        try {
            toast.info(`Processing ${capturedImages.length} images...`);

            for (const img of capturedImages) {
                try {
                    const result = await api.recognizeFaces(img.blob, knownEmbeddingsRef.current);
                    totalDetected += (result.detected_faces || 0);

                    if (result.matches && result.matches.length > 0) {
                        result.matches.forEach((match: any) => {
                            if (!uniqueRecognized.has(match.student_id)) {
                                uniqueRecognized.add(match.student_id);
                                newMatchesCount++;
                            }
                        });
                    }
                } catch (e) {
                    console.error("Error processing batch image:", e);
                }
            }

            // Update Global State
            recognizedStudentsRef.current = uniqueRecognized;
            setRecognizedCount(uniqueRecognized.size);
            setDetectedCount(totalDetected); // Shows total faces seen across all images

            if (newMatchesCount > 0) {
                toast.success(`Found ${newMatchesCount} new student(s) in batch!`);
            } else {
                toast.info("Processing complete. No new students found.");
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

        const finalAttendance = students.map((s: any) => ({
            studentId: s.id,
            name: s.profile?.name || "Unknown",
            student_id: s.student_id,
            status: recognized.has(s.id) ? 'present' as const : 'absent' as const,
            confidence: recognized.has(s.id) ? 0.95 : 0
        }));

        setAttendanceData(finalAttendance);
        setStep('verify');
        toast.success(`Recognized ${recognized.size} out of ${students.length} students`);
    }

    const startDetectionLoop = (students: any[]) => {
        if (!videoRef.current) return;
        setIsDetecting(true);
        setDetectedCount(0);
        setRecognizedCount(0);
        setTotalStudents(students.length);
        setTotalStudents(students.length);
        // We DO NOT reset recognizedStudentsRef here if coming from a "resume scan" scenario, 
        // but typically we start fresh. Let's keep it fresh for now.
        recognizedStudentsRef.current = new Set();
        setCapturedImages([]); // Reset batch on new scan start

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

        // Build known embeddings dictionary
        const knownEmbeddings: Record<string, number[]> = {};
        studentsWithEmbeddings.forEach(s => {
            const embedding = typeof s.face_embedding === 'string'
                ? JSON.parse(s.face_embedding)
                : s.face_embedding;
            knownEmbeddings[s.id] = embedding;
        });

        // Store in ref for upload handler
        knownEmbeddingsRef.current = knownEmbeddings;

        detectionInterval.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) return;

            try {
                // ... existing capture code ...
                // Capture current video frame
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                ctx.drawImage(videoRef.current, 0, 0);

                // Convert to blob
                const blob = await new Promise<Blob>((resolve) => {
                    canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8);
                });

                // Send to Python backend for recognition
                const result = await api.recognizeFaces(blob, knownEmbeddings);

                setDetectedCount(result.detected_faces || 0);

                // Update recognized students
                if (result.matches && result.matches.length > 0) {
                    result.matches.forEach((match: any) => {
                        if (!recognizedStudentsRef.current.has(match.student_id)) {
                            console.log(`✅ Matched: ${match.student_id} (confidence: ${(match.confidence * 100).toFixed(1)}%)`);
                            recognizedStudentsRef.current.add(match.student_id);
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
            }
        }, 500);

        // Auto-complete timeout REMOVED to allow manual batch processing
    };

    const stopDetectionLoop = () => {
        setIsDetecting(false);
        if (detectionInterval.current) {
            clearInterval(detectionInterval.current);
            detectionInterval.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleStartCamera = async () => {
        if (!selectedSubjectId) {
            toast.error("Please select a subject first");
            return;
        }

        try {
            const students = await api.getStudentsBySection(selectedSectionId);
            allStudentsRef.current = students; // Store for later
            setStep('camera');

            // Wait for video element to mount
            setTimeout(async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        startDetectionLoop(students);
                    }
                } catch (err) {
                    console.error("Camera access error:", err);
                    toast.error("Could not access camera (using generic fallback)");
                    // Still start loop logic so upload works, but without stream
                    startDetectionLoop(students);
                }
            }, 100);
        } catch (e) {
            toast.error("Failed to load students for this section");
        }
    };

    // ... toggleAttendance, handleSubmit, reset ...
    const toggleAttendance = (studentId: string) => {
        setAttendanceData(prev => prev.map(record =>
            record.studentId === studentId
                ? { ...record, status: record.status === 'present' ? 'absent' : 'present' }
                : record
        ));
    };

    const handleSubmit = async () => {
        if (!selectedSubjectId) return;

        setIsLoading(true);
        try {
            const logs = attendanceData.map(d => ({
                student_id: d.studentId,
                routine_id: null, // No specific routine matches manual session
                subject_id: selectedSubjectId,
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
        setSelectedFacultyId("");
        setSelectedBatchId("");
        setSelectedSectionId("");
        setSelectedSubjectId("");
        setAttendanceData([]);
    };

    if (step === 'select') {
        const filteredBatches = batches.filter(b => b.faculty_id === selectedFacultyId);
        const filteredSections = sections.filter(s => s.batch_id === selectedBatchId);
        const filteredSubjects = subjects.filter(sub => sub.section_id === selectedSectionId);

        return (
            <div className="max-w-xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Take Attendance</h1>
                    <p className="text-muted-foreground">Select a class from your routine today.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Class Selection</CardTitle>
                        <CardDescription>
                            Select the academic structure for this session.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Department</Label>
                                <Select value={selectedFacultyId} onValueChange={(v) => { setSelectedFacultyId(v); setSelectedBatchId(""); setSelectedSectionId(""); setSelectedSubjectId(""); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Batch</Label>
                                <Select value={selectedBatchId} onValueChange={(v) => { setSelectedBatchId(v); setSelectedSectionId(""); setSelectedSubjectId(""); }} disabled={!selectedFacultyId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Section</Label>
                                <Select value={selectedSectionId} onValueChange={(v) => { setSelectedSectionId(v); setSelectedSubjectId(""); }} disabled={!selectedBatchId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredSections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label>Subject</Label>
                                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!selectedSectionId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredSubjects.map(sub => <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleStartCamera} disabled={!selectedSubjectId || isLoading}>
                            <Camera className="mr-2 h-4 w-4" />
                            {isLoading ? "Loading..." : "Start Camera"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (step === 'camera') {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">Class Scan</h1>
                    <p className="text-muted-foreground">Auto-scan is running. You can also capture/upload photos for better accuracy.</p>
                </div>

                {/* Main Camera View */}
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-4 border-primary/20 shadow-2xl">
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                                <span className="font-mono text-sm uppercase tracking-wider">Live</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-400/30">
                                    <UserCheck className="w-4 h-4 text-green-400" />
                                    <span className="font-medium">{recognizedCount}/{totalStudents} Matches</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Batch Capture UI */}
                <div className="space-y-4">
                    {/* Thumbnail Strip */}
                    {capturedImages.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto py-2 bg-muted/30 p-2 rounded-lg scrollbar-hide">
                            {capturedImages.map((img, idx) => (
                                <div key={img.id} className="relative w-24 h-16 rounded border overflow-hidden shrink-0 group">
                                    <img src={img.url} className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(img.id)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                    >
                                        <XCircle className="text-white w-6 h-6" />
                                    </button>
                                    <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-[10px] px-1">
                                        #{idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Controls */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Button variant="secondary" onClick={captureFrameToBatch}>
                            <Camera className="w-4 h-4 mr-2" />
                            Snap Frame
                        </Button>

                        <div className="relative">
                            <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileUpload} />
                            <Button variant="secondary" className="w-full">
                                <FileUp className="w-4 h-4 mr-2" />
                                Upload
                            </Button>
                        </div>

                        <Button
                            className="col-span-2"
                            disabled={isProcessingBatch || capturedImages.length === 0}
                            onClick={processBatch}
                        >
                            {isProcessingBatch ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Layers className="w-4 h-4 mr-2" />}
                            Process Batch ({capturedImages.length})
                        </Button>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg">
                        <div className="text-sm text-muted-foreground">
                            Ready to finalize?
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => { stopDetectionLoop(); setStep('select'); }}>
                                Cancel
                            </Button>
                            <Button size="lg" onClick={finalizeAttendance}>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Review Attendance
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
