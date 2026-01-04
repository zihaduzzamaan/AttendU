import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
    BookOpen,
    Calendar,
    CheckCircle,
    XCircle,
    TrendingUp,
    Clock,
    MoreHorizontal,
    ArrowUpRight,
    Award
} from "lucide-react";
import { toast } from "sonner";

const StudentAttendance = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [studentData, setStudentData] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            setIsLoading(true);
            try {
                const student = await api.getStudentByProfileId(user.id);
                setStudentData(student);

                const [historyData, subjectsData] = await Promise.all([
                    api.getAttendanceHistory({ student_id: student.id }),
                    api.getSubjects(student.section_id)
                ]);

                setHistory(historyData || []);
                setSubjects(subjectsData || []);
            } catch (e) {
                toast.error("Failed to load attendance data");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user?.id]);

    const stats = useMemo(() => {
        const total = subjects.map(subject => {
            const subjectRecords = history.filter(r => (r.course_catalog_id || r.routine?.course_catalog_id) === subject.id);
            const t = subjectRecords.length;
            const p = subjectRecords.filter(r => r.status === 'present').length;
            const pct = t > 0 ? Math.round((p / t) * 100) : 0;

            return {
                subject,
                total: t,
                present: p,
                absent: t - p,
                percentage: pct,
                history: subjectRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            };
        });

        const overallPresent = total.reduce((acc, curr) => acc + curr.present, 0);
        const overallTotal = total.reduce((acc, curr) => acc + curr.total, 0);
        const overallPct = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : 0;

        return {
            subjects: total,
            overallPct,
            overallPresent,
            overallTotal,
            totalSubjects: total.length
        };
    }, [subjects, history]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                <div className="h-4 w-48 bg-slate-200 rounded" />
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-10">
            {/* Header / Summary Banner */}
            <div className="relative overflow-hidden group">
                <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] -z-10 transition-colors group-hover:bg-primary/10" />
                <div className="px-8 py-10 sm:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-primary text-white hover:bg-primary border-none text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                                Academic Year 2024
                            </Badge>
                            {stats.overallPct >= 75 && (
                                <Badge variant="outline" className="border-green-500 text-green-600 font-bold bg-green-50 shadow-sm">
                                    <Award className="w-3 h-3 mr-1" /> Elite Standing
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                            My Attendance
                        </h1>
                        <p className="text-slate-500 font-medium text-lg leading-relaxed max-w-md">
                            Your overall performance is <span className={`font-black ${stats.overallPct < 75 ? 'text-red-500' : 'text-green-600'}`}>{stats.overallPct}%</span> across all enrolled subjects.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <svg className="w-28 h-28 transform -rotate-90">
                                <circle
                                    className="text-slate-200"
                                    strokeWidth="8"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="48"
                                    cx="56"
                                    cy="56"
                                />
                                <circle
                                    className={`${stats.overallPct < 75 ? 'text-red-500' : 'text-primary'}`}
                                    strokeWidth="8"
                                    strokeDasharray={301.59}
                                    strokeDashoffset={301.59 - (stats.overallPct / 100) * 301.59}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r="48"
                                    cx="56"
                                    cy="56"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-slate-900">{stats.overallPct}%</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Overall</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Present', value: stats.overallPresent, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Total Absent', value: stats.overallTotal - stats.overallPresent, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Record Count', value: stats.overallTotal, icon: Calendar, color: 'text-primary', bg: 'bg-primary/5' },
                    { label: 'Subjects', value: stats.totalSubjects, icon: BookOpen, color: 'text-slate-600', bg: 'bg-slate-100' }
                ].map((item, idx) => (
                    <Card key={idx} className="border-none shadow-sm bg-white rounded-3xl group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <CardContent className="p-6">
                            <div className={`w-12 h-12 ${item.bg} rounded-2xl flex items-center justify-center mb-4 ring-4 ring-white shadow-sm transition-transform group-hover:scale-110`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{item.label}</h3>
                            <p className="text-3xl font-black text-slate-900 mt-1">{item.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Subject Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary" /> Subject Analytics
                    </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {stats.subjects.map((stat) => (
                        <Card
                            key={stat.subject.id}
                            className="group relative overflow-hidden bg-white border-slate-100 rounded-[2.5rem] transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200 cursor-pointer"
                            onClick={() => setSelectedSubject(stat)}
                        >
                            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${stat.percentage < 75 ? 'bg-red-500' : 'bg-primary'}`} />

                            <CardHeader className="pb-4 relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center ring-1 ring-slate-100 shadow-sm transition-colors group-hover:bg-primary/5">
                                        <BookOpen className="w-6 h-6 text-primary" />
                                    </div>
                                    <Badge className={`border-none px-3 font-black text-[10px] uppercase shadow-sm ${stat.percentage < 75 ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
                                        {stat.percentage}% SCORE
                                    </Badge>
                                </div>
                                <CardTitle className="text-xl font-black tracking-tight text-slate-800 leading-snug">
                                    {stat.subject.name}
                                </CardTitle>
                                <CardDescription className="font-bold text-xs text-slate-400 tracking-widest uppercase">
                                    ID: {stat.subject.code}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-6 relative">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500">
                                        <span>Course Loyalty</span>
                                        <span className={stat.percentage < 75 ? 'text-red-500' : 'text-green-600'}>
                                            {stat.percentage < 75 ? '⚠️ Below Threshold' : '✓ Good Standing'}
                                        </span>
                                    </div>
                                    <div className="h-4 bg-slate-50 rounded-full p-1 ring-1 ring-slate-100 transition-all group-hover:ring-primary/20">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 group-hover:animate-pulse ${stat.percentage < 75 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`}
                                            style={{ width: `${stat.percentage}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { val: stat.total, sub: 'Classes', color: 'text-slate-800' },
                                        { val: stat.present, sub: 'Present', color: 'text-green-600' },
                                        { val: stat.absent, sub: 'Absent', color: 'text-red-500' }
                                    ].map((m, i) => (
                                        <div key={i} className="bg-slate-50/50 rounded-2xl p-3 text-center border border-slate-100 transition-colors group-hover:bg-white group-hover:shadow-sm">
                                            <div className={`text-lg font-black ${m.color}`}>{m.val}</div>
                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{m.sub}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                    Click for Detail Records <ArrowUpRight className="w-3 h-3 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {stats.subjects.length === 0 && (
                        <div className="col-span-full py-24 text-center border-4 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/50">
                            <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-400 italic">No academic courses assigned to your section yet.</h3>
                        </div>
                    )}
                </div>
            </div>

            {/* Detailed Records Dialog */}
            <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)}>
                <DialogContent className="max-w-3xl rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
                    <DialogHeader className="p-8 pb-4 bg-slate-900 text-white">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black tracking-tight">{selectedSubject?.subject.name}</DialogTitle>
                                <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                    Chronological Attendance History
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 pt-0 max-h-[70vh] overflow-y-auto scrollbar-hide">
                        <div className="relative mt-8">
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-100 -z-10" />

                            {selectedSubject?.history.length ? (
                                <div className="space-y-6">
                                    {selectedSubject.history.map((record: any, idx: number) => (
                                        <div key={record.id} className="flex items-start gap-6 group">
                                            <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center ring-4 ring-white shadow-md transition-transform group-hover:scale-110 ${record.status === 'present' ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {record.status === 'present' ? <CheckCircle className="w-6 h-6 text-white" /> : <XCircle className="w-6 h-6 text-white" />}
                                            </div>

                                            <div className="flex-1 bg-slate-50/50 rounded-3xl p-5 border border-slate-100 group-hover:bg-white group-hover:shadow-xl transition-all duration-300">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-800">
                                                            {new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                        </h4>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                                                            <Clock className="w-3 h-3" /> {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })}
                                                        </p>
                                                    </div>
                                                    <Badge className={`border-none font-black text-[9px] uppercase px-3 ${record.status === 'present' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                                        {record.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
                                    <div className="text-slate-200 text-6xl mb-4">∅</div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No verification logs available for this course.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default StudentAttendance;
