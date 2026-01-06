import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Filter, Search } from "lucide-react";
import { toast } from "sonner";

interface SessionGroup {
    id: string;
    date: string;
    subjectId: string;
    subjectName: string;
    totalPresent: number;
    totalAbsent: number;
    records: any[];
}

const PastAttendance = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("all");
    const [selectedSession, setSelectedSession] = useState<SessionGroup | null>(null);
    const [allRecords, setAllRecords] = useState<any[]>([]);
    const [assignedClasses, setAssignedClasses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        if (!user?.teacher_id) {
            console.warn('⚠️ PastAttendance: No teacher_id found');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [history, assignments] = await Promise.all([
                api.getAttendanceHistory({ teacher_id: user.teacher_id }),
                api.getTeacherAssignments(user.teacher_id)
            ]);
            setAllRecords(history || []);
            setAssignedClasses(assignments || []);
        } catch (e) {
            toast.error("Failed to load attendance history");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.teacher_id]);

    // Group records into sessions by (Date -> Subject)
    const sessionsByDate = useMemo(() => {
        const dateGroups = new Map<string, { date: string, subjects: Map<string, SessionGroup> }>();

        allRecords.forEach(record => {
            const date = record.date;
            const subjId = record.course_catalog_id || record.routine?.course_catalog_id || "unknown";
            const subjName = record.course_catalog?.subject_name || record.routine?.course_catalog?.subject_name || "Unknown Subject";

            if (!dateGroups.has(date)) {
                dateGroups.set(date, { date, subjects: new Map() });
            }

            const dayGroup = dateGroups.get(date)!;
            if (!dayGroup.subjects.has(subjId)) {
                dayGroup.subjects.set(subjId, {
                    id: `${subjId}-${date}`,
                    date: date,
                    subjectId: subjId,
                    subjectName: subjName,
                    totalPresent: 0,
                    totalAbsent: 0,
                    records: []
                });
            }

            const subjectGroup = dayGroup.subjects.get(subjId)!;
            subjectGroup.records.push(record);
            if (record.status === 'present') subjectGroup.totalPresent++;
            else subjectGroup.totalAbsent++;
        });

        // Convert to sorted array
        return Array.from(dateGroups.values())
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(group => ({
                ...group,
                subjects: Array.from(group.subjects.values())
            }));
    }, [allRecords]);

    const filteredGroups = useMemo(() => {
        return sessionsByDate.map(group => {
            const filteredSubjects = group.subjects.filter(subj => {
                const matchesSubject = selectedSubject === 'all' || subj.subjectId === selectedSubject;
                const matchesSearch = subj.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesSubject && matchesSearch;
            });
            return { ...group, subjects: filteredSubjects };
        }).filter(group => group.subjects.length > 0);
    }, [sessionsByDate, selectedSubject, searchTerm]);

    const toggleStatus = async (recordId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'present' ? 'absent' : 'present';
        try {
            await api.updateResource('attendance_logs', recordId, { status: newStatus });
            setAllRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r));

            if (selectedSession) {
                const refreshedRecords = allRecords.map(r => r.id === recordId ? { ...r, status: newStatus } : r);
                const updatedSessionRecords = refreshedRecords.filter(r => {
                    const rSubjId = r.course_catalog_id || r.routine?.course_catalog_id;
                    return rSubjId === selectedSession.subjectId && r.date === selectedSession.date;
                });
                let p = 0, a = 0;
                updatedSessionRecords.forEach(r => r.status === 'present' ? p++ : a++);
                setSelectedSession({ ...selectedSession, records: updatedSessionRecords, totalPresent: p, totalAbsent: a });
            }
            toast.success("Attendance updated");
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Attendance History</h1>
                    <p className="text-slate-500 font-medium">Review and manage past classroom sessions.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="relative min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search subjects..."
                            className="h-12 pl-10 rounded-xl border-slate-200 bg-white shadow-sm focus:ring-primary/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="h-12 w-[200px] rounded-xl border-slate-200 bg-white shadow-sm">
                            <Filter className="w-4 h-4 mr-2 text-slate-400" />
                            <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                            <SelectItem value="all">All Subjects</SelectItem>
                            {assignedClasses.map(ac => (
                                <SelectItem key={ac.course_catalog_id} value={ac.course_catalog_id}>
                                    {ac.course_catalog?.subject_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {!isLoading ? (
                <div className="space-y-10">
                    {filteredGroups.length > 0 ? (
                        filteredGroups.map((group) => (
                            <div key={group.date} className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold text-slate-800 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
                                        📅 {new Date(group.date).toLocaleDateString(undefined, {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </h2>
                                    <div className="h-px flex-1 bg-slate-100" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.subjects.map((session) => (
                                        <Card key={session.id} className="group hover:border-primary/30 transition-all duration-300 bg-white border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/5 rounded-3xl overflow-hidden">
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start mb-2">
                                                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                        SESSION
                                                    </Badge>
                                                    <div className="flex gap-2 text-[10px] font-bold">
                                                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-md">P: {session.totalPresent}</span>
                                                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md">A: {session.totalAbsent}</span>
                                                    </div>
                                                </div>
                                                <CardTitle className="text-lg font-black text-slate-800 line-clamp-1">
                                                    {session.subjectName}
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="pt-2">
                                                <Button
                                                    variant="secondary"
                                                    className="w-full bg-slate-50 hover:bg-primary hover:text-white text-slate-600 font-bold rounded-xl transition-all"
                                                    onClick={() => setSelectedSession(session)}
                                                >
                                                    View Detailed List
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <Calendar className="w-16 h-16 text-slate-300 mb-4" />
                            <p className="text-slate-500 font-bold text-lg">No sessions match your search.</p>
                            <Button variant="link" onClick={() => { setSearchTerm(""); setSelectedSubject("all"); }} className="text-primary mt-2">
                                Clear all filters
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
                    ))}
                </div>
            )}

            <Dialog open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Session Details</DialogTitle>
                        <DialogDescription>
                            {selectedSession && (
                                <>
                                    {selectedSession.subjectName} - {new Date(selectedSession.date).toDateString()}
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border rounded-md mt-4 max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedSession && selectedSession.records.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-mono text-sm">{record.student?.student_id}</TableCell>
                                        <TableCell>{record.student?.profile?.name}</TableCell>
                                        <TableCell className="flex justify-end items-center gap-2">
                                            <span className={`text-xs font-medium w-12 text-right ${record.status === 'present' ? 'text-green-600' : 'text-destructive'}`}>
                                                {record.status.toUpperCase()}
                                            </span>
                                            <Switch
                                                checked={record.status === 'present'}
                                                onCheckedChange={() => toggleStatus(record.id, record.status)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PastAttendance;
