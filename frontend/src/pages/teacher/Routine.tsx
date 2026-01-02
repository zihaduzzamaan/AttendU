import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Calendar as CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

const Routine = () => {
    const { user, loading: authLoading } = useAuth();
    const [routines, setRoutines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Hierarchical Data
    const [faculties, setFaculties] = useState<any[]>([]);
    const [batches, setBatches] = useState<any[]>([]);
    const [sections, setSections] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    // Form state
    const [selectedFacultyId, setSelectedFacultyId] = useState("");
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [roomId, setRoomId] = useState("");

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const [isStructureLoading, setIsStructureLoading] = useState(false);
    const [structureError, setStructureError] = useState<string | null>(null);

    const fetchGlobalData = async () => {
        setIsStructureLoading(true);
        setStructureError(null);

        const fetchWithTimeout = async (promise: Promise<any>, name: string) => {
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`${name} fetch timed out`)), 5000)
            );
            return Promise.race([promise, timeout]);
        };

        try {
            console.log('🔄 Routine: Starting sequential structure fetch...');

            // Remove the inner .catch suppression to see the actual error (e.g. Permission Denied)
            const f = await fetchWithTimeout(api.getFaculties(), 'Faculties');
            setFaculties(f || []);

            const b = await fetchWithTimeout(api.getBatches(), 'Batches');
            setBatches(b || []);

            const s = await fetchWithTimeout(api.getSections(), 'Sections');
            setSections(s || []);

            const sub = await fetchWithTimeout(api.getSubjects(), 'Subjects');
            setSubjects(sub || []);

            console.log('✅ Routine: Structure load complete', {
                faculties: f?.length || 0
            });

            if (!f || f.length === 0) {
                setStructureError("No departments found in database. Check RLS policies.");
            }

        } catch (e: any) {
            console.error('❌ Routine: Global meta-load failed', e);
            // This will now show the actual Supabase error if RLS or connection fails
            const errorMsg = e.message || e.details || "Failed to load database structure";
            setStructureError(errorMsg);
            toast.error(`Database Error: ${errorMsg}`);
        } finally {
            setIsStructureLoading(false);
        }
    };

    const fetchTeacherRoutines = async () => {
        if (!user?.teacher_id) {
            console.warn('⚠️ Routine: Skipping fetch, no teacher_id yet', user);
            return;
        }

        setIsLoading(true);
        try {
            console.log('🔄 Routine: Fetching for teacher_id:', user.teacher_id);
            const allRoutines = await api.getRoutines({ teacher_id: user.teacher_id });
            console.log('✅ Routine: Data received:', allRoutines);

            setRoutines(allRoutines || []);

            if (allRoutines && allRoutines.length > 0) {
                toast.info(`Loaded ${allRoutines.length} routines`);
            }
        } catch (e: any) {
            console.error('❌ Routine: Failed to load routines', e);
            toast.error(`Load error: ${e.message || "Unknown error"}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchGlobalData();
        }
    }, [authLoading]);

    useEffect(() => {
        if (!authLoading && user?.teacher_id) {
            fetchTeacherRoutines();
        } else if (!authLoading) {
            setIsLoading(false);
        }
    }, [authLoading, user?.teacher_id]);

    const filteredBatches = batches.filter(b => b.faculty_id === selectedFacultyId);
    const filteredSections = sections.filter(s => s.batch_id === selectedBatchId);
    const filteredSubjects = subjects.filter(sub => sub.section_id === selectedSectionId);

    const handleSave = async () => {
        if (!selectedSubjectId || selectedDays.length === 0) {
            toast.error("Please select a subject and at least one day");
            return;
        }

        try {
            const promises = selectedDays.map(day => {
                const newRoutine = {
                    day_of_week: day,
                    start_time: startTime || null,
                    end_time: endTime || null,
                    subject_id: selectedSubjectId,
                    teacher_id: user.teacher_id,
                    room_id: roomId || 'TBD'
                };
                return api.createRoutine(newRoutine);
            });

            await Promise.all(promises);
            setIsDialogOpen(false);
            resetForm();
            toast.success("Routine added successfully");
            fetchTeacherRoutines();
        } catch (e) {
            toast.error("Failed to add routine. Check for conflicts.");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await api.deleteResource('routines', id);
            toast.success("Routine removed");
            fetchTeacherRoutines();
        } catch (e) {
            toast.error("Failed to delete routine");
        }
    };

    const resetForm = () => {
        setSelectedFacultyId("");
        setSelectedBatchId("");
        setSelectedSectionId("");
        setSelectedSubjectId("");
        setSelectedDays([]);
        setStartTime("");
        setEndTime("");
        setRoomId("");
    };

    const toggleDay = (day: string) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const sortedRoutines = [...routines].sort((a, b) => {
        const dayDiff = days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week);
        if (dayDiff !== 0) return dayDiff;
        if (!a.start_time) return -1;
        if (!b.start_time) return 1;
        return a.start_time.localeCompare(b.start_time);
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Class Routine</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your weekly class schedule.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="w-4 h-4" />
                            Set Routine
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Routine</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            {/* Hierarchy Selection */}
                            <div className="space-y-3">
                                <div className="grid gap-2">
                                    <Label>Department</Label>
                                    <Select value={selectedFacultyId} onValueChange={(v) => { setSelectedFacultyId(v); setSelectedBatchId(""); setSelectedSectionId(""); setSelectedSubjectId(""); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {isStructureLoading ? (
                                                <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                                            ) : structureError ? (
                                                <SelectItem value="error" disabled className="text-destructive font-medium">
                                                    {structureError}
                                                </SelectItem>
                                            ) : faculties.length > 0 ? (
                                                faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)
                                            ) : (
                                                <SelectItem value="none" disabled>No departments found</SelectItem>
                                            )}
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

                            {/* Multi-day Selection */}
                            <div className="grid gap-2">
                                <Label>Select Days</Label>
                                <div className="grid grid-cols-2 gap-2 p-3 border rounded-md">
                                    {days.map(d => (
                                        <div key={d} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`day-${d}`}
                                                checked={selectedDays.includes(d)}
                                                onCheckedChange={() => toggleDay(d)}
                                            />
                                            <label htmlFor={`day-${d}`} className="text-sm font-medium leading-none cursor-pointer">
                                                {d}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Optional Time & Room */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Start Time
                                        <span className="text-[10px] text-muted-foreground ml-auto">(Optional)</span>
                                    </Label>
                                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> End Time
                                        <span className="text-[10px] text-muted-foreground ml-auto">(Optional)</span>
                                    </Label>
                                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label>Room Number</Label>
                                <Input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="e.g. 301" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={!selectedSubjectId || selectedDays.length === 0}>Save Routine</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Weekly Schedule</CardTitle>
                    <CardDescription>Your current class timings</CardDescription>
                </CardHeader>
                <CardContent>
                    {!isLoading ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Day</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Batch & Section</TableHead>
                                    <TableHead>Room</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedRoutines.length > 0 ? (
                                    sortedRoutines.map((routine) => (
                                        <TableRow key={routine.id}>
                                            <TableCell className="font-medium">{routine.day_of_week}</TableCell>
                                            <TableCell>
                                                {routine.start_time ? (
                                                    `${routine.start_time.slice(0, 5)} - ${routine.end_time?.slice(0, 5)}`
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">Flexible</span>
                                                )}
                                            </TableCell>
                                            <TableCell>{routine.subject?.name}</TableCell>
                                            <TableCell>
                                                {routine.subject?.section?.batch?.name} - {routine.subject?.section?.name}
                                            </TableCell>
                                            <TableCell>{routine.room_id}</TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDelete(routine.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No routines set. Click "Set Routine" to start.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">Loading routine...</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Routine;
