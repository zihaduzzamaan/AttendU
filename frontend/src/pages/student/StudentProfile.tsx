import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Mail, Hash, Book, Layers, CheckCircle, XCircle, ScanFace } from "lucide-react";
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

    if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading profile...</div>;
    if (!student) return <div className="py-12 text-center text-sm text-muted-foreground">Student record not found. Please contact administrator.</div>;

    const ProfileItem = ({ icon: Icon, label, value, subValue }: any) => (
        <div className="flex items-center p-3 sm:p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
            <div className="p-2 sm:p-3 rounded-full bg-primary/10 mr-3 sm:mr-4 shrink-0">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">{label}</p>
                <p className="font-semibold text-base sm:text-lg truncate">{value}</p>
                {subValue && <p className="text-xs text-muted-foreground truncate">{subValue}</p>}
            </div>
        </div>
    );

    return (
        <div className="space-y-4 sm:space-y-6 pb-6">
            <div className="px-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Profile</h1>
                <p className="text-sm text-muted-foreground mt-1 sm:mt-2">
                    View your academic identity and registration status
                </p>
            </div>

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Personal Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:gap-4 md:grid-cols-2">
                        <ProfileItem
                            icon={User}
                            label="Full Name"
                            value={user.name}
                        />
                        <ProfileItem
                            icon={Hash}
                            label="Student ID"
                            value={student.student_id}
                        />
                        <ProfileItem
                            icon={Mail}
                            label="Email Address"
                            value={user.email}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Academic Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                        <ProfileItem
                            icon={Book}
                            label="Batch"
                            value={student.section?.batch?.name || "N/A"}
                        />
                        <ProfileItem
                            icon={Layers}
                            label="Section"
                            value={student.section?.name || "N/A"}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <ScanFace className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            Face Registration
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Status of your biometric registration</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-4 sm:py-6">
                        {student.face_registered ? (
                            <div className="text-center space-y-3 w-full px-2">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-base sm:text-lg text-green-700">Registration Complete</h3>
                                    <p className="text-xs sm:text-sm text-green-600">Your face data is active for attendance</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full sm:w-auto"
                                    onClick={handleRegisterFace}
                                >
                                    <ScanFace className="w-4 h-4 mr-2" />
                                    Update Face Scan
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center space-y-3 w-full px-2">
                                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                    <XCircle className="w-7 h-7 sm:w-8 sm:h-8 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-base sm:text-lg text-red-700">Not Registered</h3>
                                    <p className="text-xs sm:text-sm text-red-600">Please register your face to enable attendance</p>
                                </div>
                                <Button
                                    className="mt-2 w-full sm:w-auto"
                                    onClick={handleRegisterFace}
                                >
                                    <ScanFace className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                    Register My Face
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default StudentProfile;
