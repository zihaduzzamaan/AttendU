import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Mail,
    Hash,
    Layers,
    XCircle,
    ScanFace,
    ShieldCheck,
    Calendar,
    ChevronRight,
    Building2,
    GraduationCap,
    Info
} from "lucide-react";
import { toast } from "sonner";

const StudentProfile = () => {
    const navigate = useNavigate();
    const { user, setPendingStudentId, setSelectedRole } = useAuth();
    const [student, setStudent] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            setIsLoading(true);
            try {
                const data = await api.getStudentByProfileId(user.id);
                setStudent(data);
            } catch (e) {
                toast.error("Failed to load profile");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [user?.id]);

    const handleRegisterFace = () => {
        if ((user as any)?.face_registered) {
            toast.error("Identity Already Registered", {
                description: "Your face biometric is already locked in our system. Please contact your Department Admin to reset your identity if needed.",
                duration: 5000,
            });
            return;
        }

        if (user?.id) {
            setPendingStudentId(user.id);
            setSelectedRole('student');
            navigate("/face-registration?mode=update");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-slate-800/10" />
                <div className="h-4 w-48 bg-slate-800/10 rounded" />
            </div>
        );
    }

    if (!student) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-slate-700" />
            </div>
            <h2 className="text-xl font-black text-slate-400">Student record not found</h2>
            <p className="text-slate-600 mt-2 max-w-sm">Please contact the academic office for registration details.</p>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Unified Dark Profile Surface */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 border border-white/5 shadow-2xl p-6 sm:p-10">
                {/* Visual Accent Glows */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -ml-32 -mb-32" />

                <div className="relative space-y-8">
                    {/* Header: Name & ID Only */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-8">
                        <div className="space-y-1 text-center md:text-left">
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80">Active Session</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{user?.name}</h1>
                        </div>
                        <div className="flex flex-col items-center md:items-end gap-2 text-center md:text-right">
                            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
                                <span className="text-xl font-black text-primary tracking-tighter">{student.student_id}</span>
                            </div>
                        </div>
                    </div>

                    {/* Highly Organized Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { label: 'Faculty', val: student.section?.batch?.faculty?.name || 'Science & Tech', icon: Building2 },
                            { label: 'Batch', val: student.section?.batch?.name || 'N/A', icon: GraduationCap },
                            { label: 'Section', val: student.section?.name || 'N/A', icon: Layers },
                            { label: 'Semester', val: `${student.section?.batch?.current_semester || '1'}st Semester`, icon: Calendar },
                            { label: 'Email Address', val: user?.email, icon: Mail, full: true },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className={`${item.full ? 'md:col-span-2' : ''} group relative overflow-hidden bg-white/5 border border-white/5 rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.08] hover:border-white/10`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                        <p className="text-sm font-bold text-white tracking-wide truncate">{item.val}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Integrated Biometric Status - Compact Inline Card */}
                        <div className={`relative overflow-hidden border rounded-2xl p-4 flex items-center justify-between group cursor-pointer transition-all duration-300 ${student.face_registered
                            ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                            : 'bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10'
                            }`} onClick={handleRegisterFace}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 ${student.face_registered ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                                    }`}>
                                    {student.face_registered ? <ScanFace className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Biometrics</p>
                                    <p className={`text-sm font-black tracking-tight ${student.face_registered ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {student.face_registered ? 'Identity Locked' : 'Required'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] font-black uppercase text-white/40 tracking-widest">Update</span>
                                <ChevronRight className="w-3 h-3 text-white/40" />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Security Banner */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5 opacity-50">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Encrypted Data Protection Active</span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-medium">System Version 2.0.4.L</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
