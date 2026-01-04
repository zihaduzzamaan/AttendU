import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Clock, MapPin, Calendar, Search } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const Routine = () => {
    const { user, loading: authLoading } = useAuth();
    const [routines, setRoutines] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Form state
    const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [roomId, setRoomId] = useState("");

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    useEffect(() => {
        if (!authLoading && user?.teacher_id) {
            fetchData();
        } else if (!authLoading) {
            setIsLoading(false);
        }
    }, [authLoading, user?.teacher_id]);

    const fetchData = async () => {
        if (!user?.teacher_id) return;
        setIsLoading(true);
        try {
            const [myAssignments, myRoutines] = await Promise.all([
                api.getTeacherAssignments(user.teacher_id),
                api.getRoutines({ teacher_id: user.teacher_id })
            ]);
            setAssignments(myAssignments || []);
            setRoutines(myRoutines || []);
        } catch (e: any) {
            toast.error(`Load error: ${e.message || "Unknown error"}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedAssignmentId || selectedDays.length === 0) {
            toast.error("Please select assignment and days");
            return;
        }
        const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);
        if (!selectedAssignment) return;

        try {
            const promises = selectedDays.map(day => {
                const newRoutine = {
                    day_of_week: day,
                    start_time: startTime || null,
                    end_time: endTime || null,
                    course_catalog_id: selectedAssignment.course_catalog_id,
                    section_id: selectedAssignment.section_id,
                    teacher_id: user.teacher_id,
                    room_id: roomId || 'TBD'
                };
                return api.createRoutine(newRoutine);
            });
            await Promise.all(promises);
            setIsDialogOpen(false);
            resetForm();
            toast.success("Routine added!");
            fetchData();
        } catch (e) {
            toast.error("Failed to add routine");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove this routine?")) return;
        try {
            await api.deleteResource('routines', id);
            toast.success("Routine removed");
            fetchData();
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const resetForm = () => {
        setSelectedAssignmentId("");
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

    const routinesByDay = days.map(day => ({
        day,
        items: routines
            .filter(r => r.day_of_week === day)
            .filter(r =>
                r.course_catalog?.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.course_catalog?.subject_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.room_id?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                if (!a.start_time) return -1;
                if (!b.start_time) return 1;
                return a.start_time.localeCompare(b.start_time);
            })
    })).filter(group => group.items.length > 0);

    return (
        <div className="space-y-4 md:space-y-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Class Routine</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your weekly schedule</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 w-full sm:w-auto" disabled={assignments.length === 0}>
                            <Plus className="w-4 h-4" />
                            Set Routine
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto mx-4">
                        <DialogHeader>
                            <DialogTitle>Add New Routine</DialogTitle>
                            <p className="text-xs sm:text-sm text-muted-foreground">Set class timings</p>
                        </DialogHeader>
                        <div className="grid gap-3 py-2">
                            <div className="grid gap-2">
                                <Label className="text-sm">Select Assignment *</Label>
                                <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Choose subject" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assignments.map(a => (
                                            <SelectItem key={a.id} value={a.id} className="text-sm">
                                                {a.course_catalog?.subject_name} - {a.section?.batch?.name} {a.section?.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-sm">Select Days *</Label>
                                <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                                    {days.map(d => (
                                        <div key={d} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`day-${d}`}
                                                checked={selectedDays.includes(d)}
                                                onCheckedChange={() => toggleDay(d)}
                                            />
                                            <label htmlFor={`day-${d}`} className="text-xs sm:text-sm font-medium cursor-pointer">
                                                {d}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label className="text-xs sm:text-sm flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Start
                                    </Label>
                                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" />
                                </div>
                                <div className="grid gap-2">
                                    <Label className="text-xs sm:text-sm flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> End
                                    </Label>
                                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-9 text-sm" />
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-xs sm:text-sm flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> Room
                                </Label>
                                <Input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="e.g. 301" className="h-9" />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
                            <Button onClick={handleSave} disabled={!selectedAssignmentId || selectedDays.length === 0} className="flex-1 sm:flex-none">Save</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search routine..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {!isLoading ? (
                assignments.length > 0 ? (
                    routinesByDay.length > 0 ? (
                        <div className="space-y-4 md:space-y-6">
                            {routinesByDay.map(({ day, items }) => (
                                <Card key={day}>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center justify-between text-base md:text-lg">
                                            <span className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                                {day}
                                            </span>
                                            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {items.map((routine) => (
                                                <div key={routine.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-lg">
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div className="font-medium truncate text-sm">{routine.course_catalog?.subject_name}</div>
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {routine.section?.batch?.name} - {routine.section?.name}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            {routine.start_time ? (
                                                                <Badge variant="outline" className="text-xs whitespace-nowrap px-2">
                                                                    <Clock className="w-3 h-3 mr-1" />
                                                                    {routine.start_time.slice(0, 5)}-{routine.end_time?.slice(0, 5)}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">Flexible</span>
                                                            )}
                                                            <Badge variant="outline" className="text-xs whitespace-nowrap px-2">
                                                                <MapPin className="w-3 h-3 mr-1" />
                                                                {routine.room_id}
                                                            </Badge>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0"
                                                            onClick={() => handleDelete(routine.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <Calendar className="w-12 h-12 md:w-14 md:h-14 text-muted-foreground" />
                                    <div className="space-y-1 px-4">
                                        <h3 className="font-semibold text-base md:text-lg">No Routines Set</h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Tap "Set Routine" to create schedules
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <Calendar className="w-12 h-12 md:w-14 md:h-14 text-muted-foreground" />
                                <div className="space-y-1 px-4">
                                    <h3 className="font-semibold text-base md:text-lg">No Assignments Found</h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                        Add assignments in "Classes" first
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
            )}
        </div>
    );
};

export default Routine;
