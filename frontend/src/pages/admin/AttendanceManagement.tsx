import { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, Faculty, Batch, Section } from '@/services/api';
import { toast } from 'sonner';
import { Filter, X, Calendar as CalendarIcon, Hash, Book } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const AttendanceManagement = () => {
    const [records, setRecords] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    // Filter states
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    const [selectedFaculty, setSelectedFaculty] = useState<string>('all');
    const [selectedBatch, setSelectedBatch] = useState<string>('all');
    const [selectedSection, setSelectedSection] = useState<string>('all');
    const [selectedDate, setSelectedDate] = useState<string>('');

    // Grouping records into sessions
    const groupedSessions = records.reduce((acc: any[], curr: any) => {
        const sessionId = `${curr.date}_${curr.course_catalog_id}_${curr.section_id}`;
        let session = acc.find(s => s.id === sessionId);

        if (!session) {
            session = {
                id: sessionId,
                date: curr.date,
                created_at: curr.created_at,
                subject: curr.course_catalog,
                section: curr.section,
                students: []
            };
            acc.push(session);
        }
        session.students.push({
            id: curr.id,
            student: curr.student,
            status: curr.status,
            created_at: curr.created_at
        });
        return acc;
    }, []);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const fData = await api.getFaculties();
                setFaculties(fData);
            } catch (error) {
                console.error("Failed to load faculties", error);
            }
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        const loadBatches = async () => {
            if (selectedFaculty !== 'all') {
                const bData = await api.getBatches(selectedFaculty);
                setBatches(bData);
            } else {
                setBatches([]);
            }
            setSelectedBatch('all');
        };
        loadBatches();
    }, [selectedFaculty]);

    useEffect(() => {
        const loadSections = async () => {
            if (selectedBatch !== 'all') {
                const sData = await api.getSections(selectedBatch);
                setSections(sData);
            } else {
                setSections([]);
            }
            setSelectedSection('all');
        };
        loadSections();
    }, [selectedBatch]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const filters: any = {};
            if (selectedFaculty !== 'all') filters.faculty_id = selectedFaculty;
            if (selectedBatch !== 'all') filters.batch_id = selectedBatch;
            if (selectedSection !== 'all') filters.section_id = selectedSection;
            if (selectedDate) filters.date = selectedDate;

            const data = await api.getAttendanceHistory(filters);
            setRecords(data || []);
        } catch (error) {
            toast.error("Failed to load attendance records");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedFaculty, selectedBatch, selectedSection, selectedDate]);

    const handleClearFilters = () => {
        setSelectedFaculty('all');
        setSelectedBatch('all');
        setSelectedSection('all');
        setSelectedDate('');
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">Attendance Sessions</h2>
                    <p className="text-slate-500 font-medium">
                        Grouped viewing of daily attendance logs.
                    </p>
                </div>
                {(selectedFaculty !== 'all' || selectedBatch !== 'all' || selectedSection !== 'all' || selectedDate) && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-xl px-4"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Clear All Filters
                    </Button>
                )}
            </div>

            {/* Enhanced Filtering Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16" />

                <div className="space-y-2 relative z-10">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Department</label>
                    <Select value={selectedFaculty} onValueChange={setSelectedFaculty}>
                        <SelectTrigger className="bg-slate-50 border-none rounded-2xl h-11 focus:ring-primary/20">
                            <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl max-h-[300px]">
                            <SelectItem value="all">All Departments</SelectItem>
                            {faculties.map((f) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Academic Batch</label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch} disabled={selectedFaculty === 'all'}>
                        <SelectTrigger className="bg-slate-50 border-none rounded-2xl h-11 focus:ring-primary/20">
                            <SelectValue placeholder="Select Batch" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl max-h-[300px]">
                            <SelectItem value="all">All Batches</SelectItem>
                            {batches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Section</label>
                    <Select value={selectedSection} onValueChange={setSelectedSection} disabled={selectedBatch === 'all'}>
                        <SelectTrigger className="bg-slate-50 border-none rounded-2xl h-11 focus:ring-primary/20">
                            <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-xl max-h-[300px]">
                            <SelectItem value="all">All Sections</SelectItem>
                            {sections.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 relative z-10">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Session Date</label>
                    <div className="relative">
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-slate-50 border-none rounded-2xl h-11 focus:ring-primary/20 pl-10"
                        />
                        <CalendarIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                    </div>
                </div>
            </div>

            <div className="rounded-[2.5rem] border border-slate-50 bg-white shadow-sm overflow-hidden min-h-[400px]">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-50">
                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-6 pl-8">Date & Time</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-6">Course Information</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-6">Academic Group</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-6">Participation</TableHead>
                            <TableHead className="font-black text-slate-400 uppercase text-[10px] tracking-widest py-6 text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!isLoading ? (
                            groupedSessions.map((session) => (
                                <TableRow key={session.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors group">
                                    <TableCell className="py-5 pl-8">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700">{formatDate(session.date)}</span>
                                            <span className="text-[10px] text-slate-400 uppercase tracking-tighter">
                                                {session.created_at ? new Date(session.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-sm leading-tight">{session.subject?.subject_name}</span>
                                            <span className="text-[10px] text-primary uppercase font-black mt-0.5">{session.subject?.subject_code}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <Badge variant="outline" className="w-fit bg-slate-100 border-none text-slate-500 font-bold text-[9px] px-2 py-0 rounded-md">
                                                {session.section?.batch?.faculty?.name}
                                            </Badge>
                                            <span className="text-xs text-slate-400 mt-1 font-bold">Section {session.section?.name} • {session.section?.batch?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-emerald-500 text-white font-black text-[10px] px-2 py-0.5 rounded-lg border-none shadow-sm">
                                                {session.students.filter((s: any) => s.status === 'present').length} Present
                                            </Badge>
                                            <span className="text-[10px] text-slate-300 font-bold">/</span>
                                            <span className="text-[10px] text-slate-400 font-bold">{session.students.length} Total</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedSession(session)}
                                            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all font-black text-[10px] uppercase tracking-widest px-4 h-9"
                                        >
                                            View Attendees
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-32">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin shadow-lg" />
                                        <span className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] animate-pulse">Scanning Logs</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && groupedSessions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-32">
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <div className="w-16 h-16 bg-slate-100 rounded-[2rem] flex items-center justify-center">
                                            <Filter className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <span className="text-slate-500 font-black uppercase text-xs tracking-widest">No matching sessions</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Attendance Details Modal */}
            <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
                <DialogContent className="w-[calc(100%-2rem)] max-w-[580px] h-[780px] max-h-[92vh] flex flex-col rounded-[3rem] border-none shadow-2xl overflow-hidden p-0 bg-white">
                    <DialogHeader className="p-10 pb-12 bg-[#0F172A] text-white flex flex-col items-center shrink-0 relative">
                        {/* Elegant background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-full bg-gradient-to-b from-primary/20 to-transparent blur-[80px] pointer-events-none opacity-30" />

                        <DialogTitle className="text-2xl font-black tracking-tight leading-tight text-center px-8 relative z-10">
                            {selectedSession?.subject?.subject_name}
                        </DialogTitle>

                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 mt-2 relative z-10">
                            {selectedSession?.section?.batch?.faculty?.name || 'Department'}
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5 relative z-10">
                            <Badge className="bg-primary text-white font-black text-[9px] uppercase tracking-tighter rounded-lg px-3 py-1 border-none shadow-lg shadow-primary/20">
                                {selectedSession?.subject?.subject_code}
                            </Badge>
                            <Badge variant="outline" className="border-slate-700 bg-slate-800/50 text-slate-300 font-bold text-[9px] uppercase px-3 py-1 rounded-lg">
                                {selectedSession?.section?.batch?.name}
                            </Badge>
                            <Badge className="bg-slate-800/80 text-primary border-none font-bold text-[9px] uppercase px-3 py-1 rounded-lg">
                                Sem {selectedSession?.section?.batch?.current_semester}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-8 relative z-10">
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                <CalendarIcon className="w-3.5 h-3.5 text-primary/60" />
                                {selectedSession ? formatDate(selectedSession.date) : 'N/A'}
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-800" />
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                <Badge variant="outline" className="border-slate-800 text-slate-400 font-bold px-2 py-0 h-5 text-[9px] rounded-md">
                                    Section {selectedSession?.section?.name}
                                </Badge>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Participation Summary Card */}
                    <div className="px-10 -mt-12 relative z-20 shrink-0">
                        <div className="bg-white rounded-3xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Status</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                                            <span className="text-xl font-black text-slate-900">{selectedSession?.students.filter((s: any) => s.status === 'present').length}</span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Present</span>
                                        </div>
                                        <div className="w-px h-8 bg-slate-100" />
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                                            <span className="text-xl font-black text-slate-900">{selectedSession?.students.filter((s: any) => s.status === 'absent').length}</span>
                                            <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Absent</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-2xl font-black text-primary">
                                    {selectedSession && selectedSession.students.length > 0 ? Math.round((selectedSession.students.filter((s: any) => s.status === 'present').length / selectedSession.students.length) * 100) : 0}%
                                </span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participation Rate</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-10 pb-8 pt-0 scrollbar-hide">
                        <div className="space-y-4">
                            {selectedSession?.students.map((record: any) => (
                                <div key={record.id} className="flex items-center justify-between p-4 rounded-[2rem] bg-slate-50 border border-slate-100/30 hover:bg-white hover:shadow-xl hover:scale-[1.01] transition-all duration-500 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-slate-400 text-sm shadow-sm group-hover:bg-[#0F172A] group-hover:text-white group-hover:border-[#0F172A] transition-all duration-500">
                                            {record.student?.profile?.name?.charAt(0)}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800 text-sm leading-none transition-colors group-hover:text-slate-950">{record.student?.profile?.name}</span>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">{record.student?.student_id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge className={`rounded-xl px-4 py-1.5 font-black text-[9px] uppercase tracking-widest border-none shadow-md ${record.status === 'present' ? 'bg-emerald-500 text-white shadow-emerald-200/50' : 'bg-rose-500 text-white shadow-rose-200/50'
                                            }`}>
                                            {record.status}
                                        </Badge>
                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <Filter className="w-3 h-3 text-slate-300" />
                                            {record.created_at ? new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AttendanceManagement;
