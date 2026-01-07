import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    User,
    Mail,
    Hash,
    Book,
    Layers,
    CheckCircle,
    XCircle,
    ScanFace,
    ShieldCheck,
    MapPin,
    Calendar,
    ArrowRight,
    Camera,
    Info,
    ChevronRight,
    CreditCard,
    Settings,
    Building2,
    GraduationCap,
    Clock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
        if (user?.id) {
            setPendingStudentId(user.id);
            setSelectedRole('student');
            navigate("/face-registration?mode=update");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-slate-200" />
                <div className="h-4 w-48 bg-slate-200 rounded" />
            </div>
        );
    }

    if (!student) return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6">
                <Info className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Student record not found</h2>
            <p className="text-slate-500 mt-2 max-w-sm">Please contact the academic office for registration details.</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-12">
            {/* Premium Profile Header - Compact & Focused */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 border border-slate-800 shadow-xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/20 rounded-full blur-[90px] -mr-40 -mt-40" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-800/10 rounded-full blur-[70px] -ml-24 -mb-24" />

                <div className="relative px-6 py-8 flex flex-col md:flex-row items-center gap-6 md:items-center">
                    <div className="relative group">
                        <Avatar className="h-28 w-28 md:h-32 md:w-32 border-4 border-slate-800 shadow-2xl ring-4 ring-slate-800/50 transition-transform group-hover:scale-105 duration-500">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-slate-800 text-primary text-3xl md:text-4xl font-black">{user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-xl shadow-xl ring-4 ring-slate-900 shadow-primary/40 cursor-pointer transition-transform hover:scale-110" onClick={handleRegisterFace}>
                            <Camera className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-1">
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-1">
                            <Badge className="bg-primary/20 text-primary border-none font-black tracking-widest text-[8px] uppercase px-2 py-0.5 rounded-lg">
                                Verified
                            </Badge>
                            <Badge variant="outline" className="border-slate-800 text-slate-500 font-bold px-2 py-0.5 text-[8px] rounded-lg">
                                <Clock className="w-2.5 h-2.5 mr-1" /> Active
                            </Badge>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{user?.name}</h1>
                        <p className="text-slate-400 text-xs font-bold flex items-center justify-center md:justify-start gap-1.5 uppercase tracking-wider opacity-60">
                            <MapPin className="w-3.5 h-3.5 text-primary" /> University Main Campus
                        </p>
                    </div>

                    <div className="shrink-0">
                        <Button
                            variant="outline"
                            className="bg-slate-800/40 border-slate-700 text-white hover:bg-slate-800 rounded-xl px-4 h-10 flex items-center gap-2 text-xs font-bold tracking-tight"
                            onClick={() => toast.info("Settings disabled by admin.")}
                        >
                            <Settings className="w-4 h-4" />
                            Manage
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-5 lg:grid-cols-3">
                {/* Academic Identity Consolidated */}
                <Card className="lg:col-span-2 bg-white border-slate-100 rounded-[2rem] shadow-sm overflow-hidden hover:shadow-lg transition-all duration-500">
                    <CardHeader className="p-5 border-b border-slate-50 bg-slate-50/30">
                        <CardTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 leading-none">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                            Academic Identity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-50">
                            {[
                                { icon: Building2, label: 'Department', val: student.section?.batch?.faculty?.name || 'Academic Faculty' },
                                { icon: Hash, label: 'Enrolment ID', val: student.student_id },
                                { icon: Layers, label: 'Section', val: student.section?.name || 'N/A' },
                                { icon: GraduationCap, label: 'Batch', val: student.section?.batch?.name || 'N/A' },
                                { icon: Calendar, label: 'Semester', val: `${student.section?.batch?.current_semester || '1'}st Semester` },
                                { icon: Mail, label: 'Email', val: user?.email }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-3.5 p-4 hover:bg-slate-50/80 transition-colors group border-b border-slate-50">
                                    <div className="w-11 h-11 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:scale-105 transition-all shadow-sm ring-1 ring-slate-100">
                                        <item.icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                        <p className="text-sm font-black text-slate-800 tracking-tight leading-none truncate">{item.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Face Registration & Security Consolidated */}
                <div className="space-y-5">
                    <Card className="bg-white border-slate-100 rounded-[2rem] shadow-sm overflow-hidden group hover:shadow-lg transition-all duration-500">
                        <CardHeader className="p-5 pb-2">
                            <CardTitle className="flex items-center gap-2.5 text-lg font-black text-slate-900 leading-none">
                                <ScanFace className="w-5 h-5 text-primary" />
                                Biometrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-2">
                            <div className="p-4 rounded-[1.75rem] bg-slate-50 border border-slate-100 flex flex-col items-center gap-4 text-center group-hover:bg-white transition-all duration-500">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-6 ${student.face_registered ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'}`}>
                                    {student.face_registered ? <CheckCircle className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
                                </div>

                                <div className="space-y-1">
                                    <h3 className={`text-base font-black ${student.face_registered ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {student.face_registered ? 'Identity Verified' : 'Action Required'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                                        {student.face_registered
                                            ? 'Biometric data active & secure'
                                            : 'Biometrics required for tracking'}
                                    </p>
                                </div>

                                <Button
                                    className={`w-full h-11 rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg transition-all active:scale-95 ${student.face_registered ? 'bg-slate-900 hover:bg-black text-white' : 'bg-primary hover:bg-primary/90 text-white shadow-primary/30'}`}
                                    onClick={handleRegisterFace}
                                >
                                    {student.face_registered ? 'Update Scan' : 'Register Now'}
                                    <ArrowRight className="w-3.5 h-3.5 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Guidance / Security Card - Ultra Compact */}
                    <Card className="bg-slate-900 rounded-[2rem] p-5 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-3xl -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />

                        <div className="relative space-y-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                </div>
                                <h3 className="text-sm font-black tracking-tight">Security</h3>
                            </div>

                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                                Your data is encrypted. Maintain your email privacy to protect your identity.
                            </p>

                            <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest pt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                System Secured
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
