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
        <div className="space-y-8 pb-12">
            {/* Premium Profile Header - Simplified to avoid duplicates */}
            <div className="relative overflow-hidden rounded-[3rem] bg-slate-900 border border-slate-800 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-800/10 rounded-full blur-[80px] -ml-32 -mb-32" />

                <div className="relative px-8 py-12 flex flex-col md:flex-row items-center gap-8 md:items-end">
                    <div className="relative group">
                        <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-slate-800 shadow-2xl ring-4 ring-slate-800/50 transition-transform group-hover:scale-105 duration-500">
                            <AvatarImage src="" />
                            <AvatarFallback className="bg-slate-800 text-primary text-4xl md:text-5xl font-black">{user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-1 right-1 bg-primary text-white p-2.5 rounded-2xl shadow-xl ring-4 ring-slate-900 shadow-primary/40 cursor-pointer transition-transform hover:scale-110" onClick={handleRegisterFace}>
                            <Camera className="w-5 h-5 md:w-6 md:w-6" />
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-left space-y-2 md:pb-2">
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-2">
                            <Badge className="bg-primary/20 text-primary border-primary/20 font-black tracking-widest text-[10px] uppercase px-3 py-1">
                                Verified Profile
                            </Badge>
                            <Badge variant="outline" className="border-slate-700 text-slate-400 font-bold px-3 py-1">
                                <Clock className="w-3 h-3 mr-1" /> Active Session
                            </Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">{user?.name}</h1>
                        <p className="text-slate-400 font-medium flex items-center justify-center md:justify-start gap-2">
                            <MapPin className="w-4 h-4 text-primary" /> University Main Campus • Undergrad
                        </p>
                    </div>

                    <div className="md:pb-4">
                        <Button
                            variant="outline"
                            className="bg-transparent border-slate-700 text-white hover:bg-slate-800 rounded-2xl md:px-6 h-12 flex items-center gap-2"
                            onClick={() => toast.info("Profile editing is disabled by administrator.")}
                        >
                            <Settings className="w-5 h-5" />
                            Settings
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid gap-8 lg:grid-cols-3">
                {/* Personal & Academic Identity Consolidated */}
                <Card className="lg:col-span-2 bg-white border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-xl transition-shadow duration-500">
                    <CardHeader className="p-8 border-b border-slate-50">
                        <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900">
                            <ShieldCheck className="w-6 h-6 text-primary" />
                            Academic Identity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-50">
                            {[
                                { icon: Building2, label: 'Department', val: student.section?.batch?.faculty?.name || 'Academic Faculty', detail: 'Faculty of study' },
                                { icon: Hash, label: 'Student Enrolment ID', val: student.student_id, detail: 'Unique system identifier' },
                                { icon: Layers, label: 'Current Section', val: student.section?.name || 'N/A', detail: 'Class division' },
                                { icon: GraduationCap, label: 'Academic Batch', val: student.section?.batch?.name || 'N/A', detail: 'Admission group' },
                                { icon: Calendar, label: 'Current Semester', val: `${student.section?.batch?.current_semester || '1'}st Semester`, detail: 'Current progress level' },
                                { icon: Mail, label: 'University Email', val: user?.email, detail: 'Official communication channel' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-6 p-8 hover:bg-slate-50 transition-colors group">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all shadow-sm ring-1 ring-slate-100">
                                        <item.icon className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                                        <p className="text-lg font-black text-slate-800 tracking-tight leading-none">{item.val}</p>
                                        <p className="text-xs text-slate-400 mt-2 font-medium">{item.detail}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Face Registration Status - Only show non-duplicate unique cards here */}
                <div className="space-y-8">
                    <Card className="bg-white border-slate-100 rounded-[2.5rem] shadow-sm overflow-hidden group">
                        <CardHeader className="p-8 pb-4">
                            <CardTitle className="flex items-center gap-3 text-xl font-black text-slate-900">
                                <ScanFace className="w-6 h-6 text-primary" />
                                Biometrics
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-8 pb-8 pt-4">
                            <div className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col items-center gap-6 text-center group-hover:bg-white group-hover:shadow-xl transition-all duration-500">
                                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-lg transform transition-transform group-hover:rotate-12 ${student.face_registered ? 'bg-green-500 text-white shadow-green-200' : 'bg-red-500 text-white shadow-red-200'}`}>
                                    {student.face_registered ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                                </div>

                                <div>
                                    <h3 className={`text-xl font-black ${student.face_registered ? 'text-green-600' : 'text-red-600'}`}>
                                        {student.face_registered ? 'Identity Verified' : 'Action Required'}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">
                                        {student.face_registered
                                            ? 'Your biometric data is active and secure in our system.'
                                            : 'Please register your face to enable AI-powered attendance tracking.'}
                                    </p>
                                </div>

                                <Button
                                    className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95 ${student.face_registered ? 'bg-slate-900 hover:bg-black text-white' : 'bg-primary hover:bg-primary/90 text-white shadow-primary/30'}`}
                                    onClick={handleRegisterFace}
                                >
                                    {student.face_registered ? 'Re-scan Face Data' : 'Start Registration'}
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Guidance / Security Card */}
                    <Card className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />

                        <div className="relative space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                                    <ShieldCheck className="w-5 h-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-black tracking-tight">Security Note</h3>
                            </div>

                            <div className="space-y-4">
                                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                    Your academic and biometric data are encrypted and stored securely. Maintain your email privacy to protect your identity.
                                </p>
                                <div className="h-px bg-slate-800" />
                                <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-widest">
                                    <CheckCircle className="w-3 h-3" /> System Secured
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentProfile;
