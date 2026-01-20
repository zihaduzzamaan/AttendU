import { AnimatePresence, motion } from "framer-motion";
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
    Layers,
    ChevronDown
} from "lucide-react";
import { toast } from "sonner";

const StudentAttendance = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState<any[]>(() => {
        const cached = localStorage.getItem(`attendance_history_${user?.id}`);
        return cached ? JSON.parse(cached) : [];
    });
    const [subjects, setSubjects] = useState<any[]>(() => {
        const cached = localStorage.getItem(`attendance_subjects_${user?.id}`);
        return cached ? JSON.parse(cached) : [];
    });
    const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Initial loading should only be true if we don't have cached data
    const [isLoading, setIsLoading] = useState(!history.length);

    useEffect(() => {
        const fetchData = async () => {
            const studentId = (user as any)?.student_id;
            const sectionId = (user as any)?.section_id;

            if (!studentId || !sectionId) return;

            try {
                const [historyData, subjectsData] = await Promise.all([
                    api.getAttendanceHistory({ student_id: studentId }),
                    api.getSubjects(sectionId)
                ]);

                setHistory(historyData || []);
                setSubjects(subjectsData || []);

                // Cache for next time
                localStorage.setItem(`attendance_history_${user?.id}`, JSON.stringify(historyData || []));
                localStorage.setItem(`attendance_subjects_${user?.id}`, JSON.stringify(subjectsData || []));
            } catch (e) {
                console.error("Fetcher error:", e);
                // Only show toast if we have no data at all
                if (!history.length) toast.error("Failed to load attendance data");
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
        <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-in fade-in duration-700">
            {/* Minimal Header */}
            <div className="flex flex-col items-center text-center gap-3 px-2">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Academic Attendance</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Section Overview & Course Statistics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-200 text-slate-500 font-bold px-3 py-1 rounded-full bg-white shadow-sm text-[10px]">
                        {stats.overallPct}% Overall
                    </Badge>
                    {stats.overallPct >= 75 && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1 rounded-full font-bold text-[10px]">
                            <Award className="w-3 h-3 mr-1" /> Good Standing
                        </Badge>
                    )}
                </div>
            </div>

            {/* Quick Stats Grid - Forced Single Row on Mobile */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4 px-1 sm:px-4">
                {[
                    { label: 'Attended', value: stats.overallPresent, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Missed', value: stats.overallTotal - stats.overallPresent, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Recordings', value: stats.overallTotal, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Courses', value: stats.totalSubjects, icon: BookOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                ].map((item, idx) => (
                    <Card key={idx} className="border-none shadow-sm bg-white rounded-xl sm:rounded-2xl group hover:shadow-md transition-all duration-300">
                        <CardContent className="p-2 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center text-center sm:text-left gap-1 sm:gap-3">
                            <div className={`w-8 h-8 sm:w-11 sm:h-11 ${item.bg} rounded-lg sm:rounded-xl flex items-center justify-center shrink-0`}>
                                <item.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${item.color}`} />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-[7px] sm:text-[10px] font-black text-slate-400 uppercase tracking-tight sm:tracking-widest leading-none truncate">{item.label}</h3>
                                <div className="text-sm sm:text-xl font-black text-slate-900 mt-0.5 sm:mt-1">{item.value}</div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Expandable Course List */}
            <div className="grid gap-3 px-1 sm:px-4">
                {stats.subjects.map((stat) => (
                    <Card
                        key={stat.subject.id}
                        className={`group relative overflow-hidden bg-white/80 backdrop-blur-sm border-2 transition-all duration-500 rounded-[1.5rem] sm:rounded-[2.5rem] cursor-pointer shadow-sm ${expandedId === stat.subject.id ? 'border-primary/30 shadow-lg' : 'border-slate-50 hover:border-primary/20'
                            }`}
                        onClick={() => setExpandedId(expandedId === stat.subject.id ? null : stat.subject.id)}
                    >
                        <CardHeader className="p-4 sm:p-6 relative z-10 transition-all duration-300">
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-colors ${expandedId === stat.subject.id ? 'bg-primary/10' : 'bg-slate-50'}`}>
                                        <BookOpen className={`w-5 h-5 sm:w-6 sm:h-6 ${expandedId === stat.subject.id ? 'text-primary' : 'text-slate-400'}`} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-base sm:text-xl font-black tracking-tight text-slate-900 truncate">
                                                {stat.subject.name}
                                            </CardTitle>
                                            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none px-2 py-0.5 rounded-lg font-black text-[9px] sm:text-[10px] uppercase shrink-0">
                                                {stat.subject.code}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${stat.percentage < 75 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                {stat.percentage}% Attendance
                                            </span>
                                            <span className="text-slate-300">•</span>
                                            <span className="text-[10px] font-bold text-slate-400">{stat.total} Classes</span>
                                        </div>
                                    </div>
                                </div>
                                <motion.div
                                    animate={{ rotate: expandedId === stat.subject.id ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="shrink-0"
                                >
                                    <ChevronDown className={`w-5 h-5 ${expandedId === stat.subject.id ? 'text-primary' : 'text-slate-300'}`} />
                                </motion.div>
                            </div>
                        </CardHeader>

                        <AnimatePresence>
                            {expandedId === stat.subject.id && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                >
                                    <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-5 border-t border-slate-50 pt-5 relative z-10">
                                        {/* Dynamic Gradient Accents */}
                                        <div className="absolute top-0 left-1/4 right-1/4 h-12 bg-emerald-500/10 blur-[40px] rounded-full -z-10" />

                                        {/* Progress Bar with Integrated Stats */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end px-1">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Attendance Score</span>
                                                    <div className="flex items-center gap-1.5 mt-1.5">
                                                        <Badge className={`border-none px-2 py-0.5 font-black text-[12px] rounded-lg shadow-sm ${stat.percentage < 75 ? 'bg-rose-500 text-white' : 'bg-primary text-white'}`}>
                                                            {stat.percentage}%
                                                        </Badge>
                                                        <span className="text-[10px] font-bold text-slate-300">/</span>
                                                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                                                            <Award className={`w-3 h-3 ${stat.percentage < 75 ? 'text-rose-400' : 'text-primary'}`} />
                                                            <span className="text-[11px] font-black text-slate-700 tracking-tight">{stat.marks} Pts</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-wider py-1 rounded-full ${stat.percentage < 75 ? 'border-rose-100 text-rose-500 bg-rose-50/30' : 'border-emerald-100 text-emerald-600 bg-emerald-50/30'}`}>
                                                    {stat.percentage >= 75 ? 'Perfect Standing' : 'Below Requirement'}
                                                </Badge>
                                            </div>
                                            <div className="h-6 bg-slate-50 rounded-2xl p-1 shadow-inner ring-1 ring-slate-100 relative overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${stat.percentage}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className={`h-full rounded-xl shadow-sm ${stat.percentage < 75 ? 'bg-gradient-to-r from-rose-400 to-rose-600 shadow-rose-500/20' : 'bg-gradient-to-r from-primary/60 to-primary shadow-primary/20'}`}
                                                >
                                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)25%,transparent 25%,transparent 50%,rgba(255,255,255,0.2)50%,rgba(255,255,255,0.2)75%,transparent 75%,transparent)] bg-[length:24px_24px] animate-[shimmer_2s_linear_infinite]" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* Minimal Bento Stats */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { val: stat.total, sub: 'Classes', color: 'text-slate-800', bg: 'bg-slate-50' },
                                                { val: stat.present, sub: 'Attended', color: 'text-emerald-600', bg: 'bg-emerald-50/50' },
                                                { val: stat.absent, sub: 'Missed', color: 'text-rose-500', bg: 'bg-rose-50/50' }
                                            ].map((m, i) => (
                                                <div key={i} className={`${m.bg} rounded-2xl p-3 sm:p-4 text-center border border-slate-100/50 transition-all duration-300 hover:shadow-md hover:bg-white`}>
                                                    <div className={`text-lg sm:text-xl font-black ${m.color}`}>{m.val}</div>
                                                    <div className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">{m.sub}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div
                                            className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors group/btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedSubject(stat);
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-primary uppercase tracking-[0.1em]">Analyze Detailed Records</span>
                                                <span className="text-[9px] text-slate-400 font-bold">View full attendance logs & timestamps</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30 group-hover/btn:scale-110 transition-transform">
                                                <ArrowUpRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </motion.div>
                            )}
                        </AnimatePresence>
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
                <DialogContent className="w-[calc(100%-3rem)] max-w-[360px] h-[550px] flex flex-col rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-white [&>button]:text-white/50 hover:[&>button]:text-white [&>button]:right-6 [&>button]:top-6 [&>button]:transition-all">
                    <DialogHeader className="p-6 pb-4 bg-slate-900 text-white text-center flex flex-col items-center shrink-0">
                        <DialogTitle className="text-lg font-black tracking-tight leading-tight">{selectedSubject?.subject.name}</DialogTitle>
                        <DialogDescription className="text-primary font-black uppercase text-[8px] tracking-[0.2em] mt-1.5 bg-primary/10 px-2 py-0.5 rounded-full">
                            History Logs
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 p-5 pt-2 overflow-y-auto scrollbar-hide">
                        <div className="relative">
                            {/* Simple Vertical Timeline Line */}
                            <div className="absolute left-[0.625rem] top-2 bottom-2 w-0.5 bg-slate-100" />

                            {selectedSubject?.history.length ? (
                                <div className="space-y-3">
                                    {selectedSubject.history.map((record: any) => (
                                        <div key={record.id} className="flex items-center gap-4 group">
                                            {/* Status Dot Indicator */}
                                            <div className={`w-5 h-5 shrink-0 rounded-full ring-4 ring-white shadow-sm relative z-10 transition-transform group-hover:scale-110 ${record.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                            {/* Compact Record Card */}
                                            <div className="flex-1 bg-slate-50/50 rounded-2xl p-3 border border-slate-100 group-hover:bg-white transition-all duration-300">
                                                <div className="flex justify-between items-center gap-2">
                                                    <div className="space-y-0.5">
                                                        <h4 className="text-[13px] font-black text-slate-900 tracking-tight leading-none">
                                                            {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </h4>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                                            {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' })} • {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>

                                                    <Badge className={`border-none font-black text-[7.5px] uppercase px-2 py-0.5 rounded-lg ${record.status === 'present' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                        {record.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 mt-2">
                                    <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[8px]">No activity logs found</p>
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
