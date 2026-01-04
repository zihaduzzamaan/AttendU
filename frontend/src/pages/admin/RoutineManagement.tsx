import { useState, useEffect } from 'react';
import { Trash2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, Faculty, Batch, Section, Subject } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

const RoutineManagement = () => {
    const { toast } = useToast();
    const [routines, setRoutines] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Form Data States
    const [teachers, setTeachers] = useState<any[]>([]);
    const [departments, setDepartments] = useState<Faculty[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);

    // Selection States
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [day, setDay] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [room, setRoom] = useState('');

    // Filter States
    const [filterDept, setFilterDept] = useState('all');
    const [filterBatch, setFilterBatch] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [routinesData, teachersData, deptsData, batchesData, sectionsData, subjectsData] = await Promise.all([
                api.getRoutines(),
                api.getTeachers(),
                api.getFaculties(),
                api.getBatches(),
                api.getSections(),
                api.getSubjects()
            ]);
            setRoutines(routinesData || []);
            setTeachers(teachersData || []);
            setDepartments(deptsData || []);
            setBatches(batchesData || []);
            setSections(sectionsData || []);
            setSubjects(subjectsData || []);
        } catch (error) {
            console.error("Failed to fetch data", error);
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleCreate = async () => {
        if (!selectedTeacher || !selectedSubject || !day || !startTime || !endTime) {
            toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
            return;
        }

        try {
            await api.createRoutine({
                teacher_id: selectedTeacher,
                subject_id: selectedSubject,
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                room_id: room || null
            });
            toast({ title: 'Success', description: 'Routine created successfully' });
            setIsDialogOpen(false);
            fetchData();
            // Reset form
            setSelectedTeacher('');
            setSelectedSubject('');
            setDay('');
            setStartTime('');
            setEndTime('');
            setRoom('');
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to create routine', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this routine?')) {
            try {
                await api.deleteResource('routines', id);
                toast({ title: 'Routine deleted' });
                fetchData();
            } catch (e) {
                toast({ title: 'Error', description: 'Failed to delete routine', variant: 'destructive' });
            }
        }
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card p-4 sm:p-6 rounded-lg border shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Routine Management</h2>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        View and manage class schedules.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-[200px]">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search routine..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                    <Select value={filterDept} onValueChange={(val) => { setFilterDept(val); setFilterBatch('all'); }}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Filter Dept" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Depts</SelectItem>
                            {departments.map((d) => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filterBatch} onValueChange={setFilterBatch} disabled={filterDept === 'all'}>
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Filter Batch" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Batches</SelectItem>
                            {batches.filter(b => b.faculty_id === filterDept).map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 w-full sm:w-auto">
                                <Plus className="w-4 h-4" /> Add Routine
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full p-4 sm:p-6">
                            <DialogHeader>
                                <DialogTitle>Add New Routine</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                {/* Academic Hierarchy (First) */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Department</Label>
                                        <Select value={selectedDept} onValueChange={(val) => { setSelectedDept(val); setSelectedBatch(''); }}>
                                            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                                            <SelectContent>
                                                {departments.map((d) => (
                                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Batch</Label>
                                        <Select value={selectedBatch} onValueChange={setSelectedBatch} disabled={!selectedDept}>
                                            <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                                            <SelectContent>
                                                {batches.filter(b => b.faculty_id === selectedDept).map((b) => (
                                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Section</Label>
                                        <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedBatch}>
                                            <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                                            <SelectContent>
                                                {sections.filter(s => s.batch_id === selectedBatch).map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Subject</Label>
                                        <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={!selectedSection}>
                                            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                                            <SelectContent>
                                                {subjects.filter(s => s.section_id === selectedSection).map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Teacher Selection */}
                                <div className="grid gap-2">
                                    <Label>Teacher</Label>
                                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Teacher" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teachers.map((t) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.profile?.name} ({t.employee_id || 'No ID'})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Schedule */}
                                <div className="grid gap-2">
                                    <Label>Day of Week</Label>
                                    <Select value={day} onValueChange={setDay}>
                                        <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger>
                                        <SelectContent>
                                            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                                                <SelectItem key={d} value={d}>{d}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Start Time</Label>
                                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>End Time</Label>
                                        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Room No</Label>
                                        <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. 302" />
                                    </div>
                                </div>

                                <Button onClick={handleCreate} className="w-full mt-2">Create Routine</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="rounded-md border bg-card overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">Day</TableHead>
                            <TableHead className="w-[100px]">Time</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="hidden md:table-cell">Teacher</TableHead>
                            <TableHead className="hidden sm:table-cell">Batch/Section</TableHead>
                            <TableHead className="hidden lg:table-cell">Room</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {routines
                            .filter(routine => {
                                // 1. Filter by Dept
                                if (filterDept !== 'all' && routine.subject?.section?.batch?.faculty_id !== filterDept) return false;

                                // 2. Filter by Batch
                                if (filterBatch !== 'all' && routine.subject?.section?.batch_id !== filterBatch) return false;

                                // 3. Filter by Search Query
                                if (searchQuery) {
                                    const q = searchQuery.toLowerCase();
                                    const subjectName = routine.subject?.name?.toLowerCase() || '';
                                    const subjectCode = routine.subject?.code?.toLowerCase() || '';
                                    const teacherName = routine.teacher?.name?.toLowerCase() || '';
                                    return subjectName.includes(q) || subjectCode.includes(q) || teacherName.includes(q);
                                }
                                return true;
                            })
                            .map((routine) => (
                                <TableRow key={routine.id}>
                                    <TableCell className="font-medium">{routine.day_of_week}</TableCell>
                                    <TableCell>{routine.start_time?.slice(0, 5)} - {routine.end_time?.slice(0, 5)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span>{routine.subject?.name}</span>
                                            <span className="text-xs text-muted-foreground">{routine.subject?.code}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{routine.teacher?.name}</TableCell>
                                    <TableCell>
                                        {routine.subject?.section?.batch?.name} - {routine.subject?.section?.name}
                                    </TableCell>
                                    <TableCell>{routine.room_id || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(routine.id)}>
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        {routines.length === 0 && !isLoading && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No routines found.
                                </TableCell>
                            </TableRow>
                        )}
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    Loading schedules...
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default RoutineManagement;
