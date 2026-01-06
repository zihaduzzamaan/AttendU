import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    BookOpen,
    Calendar,
    CheckCircle,
    XCircle,
    TrendingUp,
    Clock,
    ArrowUpRight,
    Award,
    Layers
} from "lucide-react";
import { toast } from "sonner";

const StudentAttendance = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [history, setHistory] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<any | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?.id) return;
            setIsLoading(true);
            try {
                const student = await api.getStudentByProfileId(user.id);
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
            const marks = t > 0 ? Number(((p / t) * 7).toFixed(2)) : 0;

            return {
                subject,
                total: t,
                present: p,
                absent: t - p,
                percentage: pct,
                marks: marks,
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 animate-bounce flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div className="h-4 w-48 bg-slate-100 rounded-full animate-pulse" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 pt-4 animate-in fade-in duration-700">
            {/* Minimal Header */}
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 px-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Academic Attendance</h1>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Section Overview & Course Statistics</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold px-4 py-1.5 rounded-full bg-white shadow-sm">
                        {stats.overallPct}% Overall
                    </Badge>
                    {stats.overallPct >= 75 && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 rounded-full font-bold">
                            <Award className="w-3.5 h-3.5 mr-1.5" /> Good Standing
                        </Badge>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid - More Compact */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4">
                {[
                    { label: 'Attended', value: stats.overallPresent, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Missed', value: stats.overallTotal - stats.overallPresent, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Recordings', value: stats.overallTotal, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Courses', value: stats.totalSubjects, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                ].map((item, idx) => (
                    <Card key={idx} className="border-none shadow-sm bg-white rounded-3xl group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                                <item.icon className={`w-5 h-5 ${item.color}`} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</h3>
                                <div className="text-xl font-black text-slate-900 mt-1">{item.value}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Subject Grid - Reverted to User-Preferred Glassmorphism Style */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 px-4">
                {stats.subjects.map((stat) => (
                    <Card
                        key={stat.subject.id}
                        className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border-2 border-slate-50 rounded-[2.5rem] transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.08)] hover:border-primary/30 cursor-pointer"
                        onClick={() => setSelectedSubject(stat)}
                    >
                        {/* Dynamic Gradient Accent */}
                        <div className={`absolute top-0 right-0 w-40 h-40 -mr-12 -mt-12 rounded-full blur-[80px] opacity-10 transition-all duration-700 group-hover:opacity-30 group-hover:scale-125 ${stat.percentage < 75 ? 'bg-rose-500' : 'bg-primary'}`} />

                        <CardHeader className="p-8 pb-4 relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ring-4 ring-white shadow-lg transition-all duration-500 ${stat.percentage < 75 ? 'bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white' : 'bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white'}`}>
                                    <BookOpen className="w-7 h-7" />
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Badge className={`border-none px-4 py-1.5 font-black text-[10px] uppercase rounded-full shadow-lg transition-all duration-500 ${stat.percentage < 75 ? 'bg-rose-500 shadow-rose-500/20 text-white' : 'bg-slate-900 shadow-slate-900/20 text-white group-hover:bg-primary group-hover:shadow-primary/20'}`}>
                                        {stat.percentage}% Present
                                    </Badge>
                                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-inner group-hover:bg-white transition-colors">
                                        <Award className={`w-3.5 h-3.5 ${stat.percentage < 75 ? 'text-rose-400' : 'text-primary'}`} />
                                        <span className="text-[10px] font-black text-slate-600 tracking-tight">Marks: {stat.marks}</span>
                                    </div>
                                </div>
                            </div>

                            <CardTitle className="text-2xl font-black tracking-tight text-slate-800 line-clamp-2 min-h-[4rem] transition-all duration-500 group-hover:translate-x-1">
                                {stat.subject.name}
                            </CardTitle>

                            <CardDescription className="flex items-center gap-2 font-bold text-[10px] text-slate-400 tracking-widest uppercase mt-2">
                                <span className="px-2 py-0.5 bg-slate-100 rounded italic group-hover:bg-slate-200 transition-colors">#{stat.subject.code}</span>
                                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${stat.percentage < 75 ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                                <span className="group-hover:text-slate-600 transition-colors">Status: {stat.percentage < 75 ? 'Critical' : 'Operational'}</span>
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="px-8 pb-10 space-y-8 relative z-10">
                            {/* Refined Progress Bar */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Term Consistency</span>
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${stat.percentage < 75 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                        {stat.percentage}% SCORE
                                    </span>
                                </div>
                                <div className="h-5 bg-slate-50 rounded-2xl p-1 shadow-inner ring-1 ring-slate-100 group-hover:ring-primary/10 transition-all">
                                    <div
                                        className={`h-full rounded-xl transition-all duration-[1.5s] ease-out shadow-sm ${stat.percentage < 75 ? 'bg-gradient-to-r from-rose-400 to-rose-600 shadow-rose-500/20' : 'bg-gradient-to-r from-primary/60 to-primary shadow-primary/20'}`}
                                        style={{ width: `${stat.percentage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Minimal Bento Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { val: stat.total, sub: 'Classes', color: 'text-slate-800', bg: 'bg-slate-50' },
                                    { val: stat.present, sub: 'Attended', color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                                    { val: stat.absent, sub: 'Missed', color: 'text-rose-500', bg: 'bg-rose-50/50' }
                                ].map((m, i) => (
                                    <div key={i} className={`${m.bg} rounded-[1.5rem] p-4 text-center border-2 border-transparent transition-all duration-300 group-hover:bg-white group-hover:border-slate-50 group-hover:shadow-lg`}>
                                        <div className={`text-xl font-black ${m.color}`}>{m.val}</div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{m.sub}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-black text-primary uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                <span>Analyze Detailed Records</span>
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {stats.subjects.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/50">
                        <Layers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-400 italic">No courses found for this section.</h3>
                    </div>
                )}
            </div>

            {/* Detailed Records Dialog */}
            <Dialog open={!!selectedSubject} onOpenChange={(open) => !open && setSelectedSubject(null)}>
                <DialogContent className="max-w-2xl rounded-[2rem] border-none shadow-2xl overflow-hidden p-0">
                    <DialogHeader className="p-7 pb-3 bg-slate-900 text-white">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black tracking-tight">{selectedSubject?.subject.name}</DialogTitle>
                                <DialogDescription className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-0.5">
                                    Attendance Timeline
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-7 pt-0 max-h-[65vh] overflow-y-auto scrollbar-hide">
                        <div className="relative mt-8">
                            <div className="absolute left-[1.125rem] top-0 bottom-0 w-0.5 bg-slate-100" />

                            {selectedSubject?.history.length ? (
                                <div className="space-y-5">
                                    {selectedSubject.history.map((record: any) => (
                                        <div key={record.id} className="flex items-start gap-4 group">
                                            <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ring-4 ring-white shadow-sm transition-transform group-hover:scale-105 relative z-10 ${record.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                                                {record.status === 'present' ? <CheckCircle className="w-5 h-5 text-white" /> : <XCircle className="w-5 h-5 text-white" />}
                                            </div>

                                            <div className="flex-1 bg-slate-50/50 rounded-2xl p-4 border border-slate-100 group-hover:bg-white group-hover:shadow-lg transition-all duration-300">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-base font-black text-slate-800 tracking-tight">
                                                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </h4>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long' })} • {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                    <Badge className={`border-none font-black text-[8px] uppercase px-2 py-0.5 ${record.status === 'present' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                        {record.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs font-black">No logs found</p>
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
