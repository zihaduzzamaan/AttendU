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

    // Group records into sessions by (Subject + Date)
    const sessions = useMemo(() => {
        const grouped = new Map<string, SessionGroup>();

        allRecords.forEach(record => {
            const subjId = record.course_catalog_id || record.routine?.course_catalog_id || "unknown";
            const subjName = record.course_catalog?.subject_name || record.routine?.course_catalog?.subject_name || "Unknown Subject";
            const key = `${subjId}-${record.date}`;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    id: key,
                    date: record.date,
                    subjectId: subjId,
                    subjectName: subjName,
                    totalPresent: 0,
                    totalAbsent: 0,
                    records: []
                });
            }
            const group = grouped.get(key)!;
            group.records.push(record);
            if (record.status === 'present') group.totalPresent++;
            else group.totalAbsent++;
        });

        return Array.from(grouped.values()).sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [allRecords]);

    const filteredSessions = sessions.filter(session => {
        const matchesSubject = selectedSubject === 'all' || session.subjectId === selectedSubject;
        const matchesSearch = session.subjectName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSubject && matchesSearch;
    });

    const toggleStatus = async (recordId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'present' ? 'absent' : 'present';
        try {
            await api.updateResource('attendance_logs', recordId, { status: newStatus });

            // Optimistic update
            setAllRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r));

            // Re-sync the selected session view
            if (selectedSession) {
                const refreshedRecords = allRecords.map(r => r.id === recordId ? { ...r, status: newStatus } : r);
                const updatedSessionRecords = refreshedRecords.filter(r => {
                    const rSubjId = r.course_catalog_id || r.routine?.course_catalog_id;
                    return rSubjId === selectedSession.subjectId && r.date === selectedSession.date;
                });

                let p = 0, a = 0;
                updatedSessionRecords.forEach(r => r.status === 'present' ? p++ : a++);

                setSelectedSession({
                    ...selectedSession,
                    records: updatedSessionRecords,
                    totalPresent: p,
                    totalAbsent: a
                });
            }
            toast.success("Attendance updated");
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Attendance History</h1>
                <p className="text-muted-foreground mt-2">
                    Review and update past class attendance records.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Session History
                        </CardTitle>
                        <div className="flex gap-2">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search subjects..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                                <SelectTrigger className="w-[180px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="All Subjects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Subjects</SelectItem>
                                    {/* Show assigned classes */}
                                    {assignedClasses.map(ac => (
                                        <SelectItem key={ac.course_catalog_id} value={ac.course_catalog_id}>
                                            {ac.course_catalog?.subject_name}
                                        </SelectItem>
                                    ))}
                                    {/* Show unique subjects from history that aren't in assignments (e.g. manual sessions) */}
                                    {sessions
                                        .filter(s => !assignedClasses.some(ac => ac.subject_id === s.subjectId))
                                        .map(s => (
                                            <SelectItem key={s.subjectId} value={s.subjectId}>
                                                {s.subjectName} (Manual)
                                            </SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!isLoading ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Attendance</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSessions.length > 0 ? (
                                    filteredSessions.map((session) => (
                                        <TableRow key={session.id}>
                                            <TableCell className="font-medium">
                                                {new Date(session.date).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell>{session.subjectName}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 text-xs">
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        P: {session.totalPresent}
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                        A: {session.totalAbsent}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => setSelectedSession(session)}>
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No sessions found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">Loading history...</div>
                    )}
                </CardContent>
            </Card>

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
