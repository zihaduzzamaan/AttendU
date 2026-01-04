import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, CheckCircle, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TeacherDashboard = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [stats, setStats] = useState({
        assignedCount: 0,
        todayCount: 0,
        attendanceTaken: 0
    });
    const [todayClasses, setTodayClasses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        if (!user?.teacher_id) {
            console.warn('⚠️ Dashboard: No teacher_id found in user context');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const today = days[new Date().getDay()];

            // 1. Get Teacher Assignments & Routine
            const [myRoutines, allAssignments] = await Promise.all([
                api.getRoutines({ teacher_id: user.teacher_id, day: today }),
                api.getTeacherAssignments(user.teacher_id)
            ]);

            setTodayClasses(myRoutines || []);
            setStats({
                assignedCount: allAssignments?.length || 0,
                todayCount: myRoutines?.length || 0,
                attendanceTaken: 0 // Will implement detailed stats later
            });
        } catch (error) {
            console.error("Dashboard fetch error", error);
            toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.teacher_id]);

    return (
        <div className="space-y-4 md:space-y-6 pb-6">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight px-1">Dashboard</h1>

            {/* Stats Grid - Mobile: 1 col, Tablet+: 3 cols */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium whitespace-nowrap">
                            Assigned Classes
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.assignedCount}</div>
                        <p className="text-xs text-muted-foreground truncate">
                            Total assignments
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium whitespace-nowrap">
                            Today's Routine
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todayCount}</div>
                        <p className="text-xs text-muted-foreground truncate">
                            Classes today
                        </p>
                    </CardContent>
                </Card>

                <Card className="sm:col-span-2 lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium whitespace-nowrap">
                            Attendance Taken
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.attendanceTaken}</div>
                        <p className="text-xs text-muted-foreground truncate">
                            Sessions today
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Schedule - Mobile optimized */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg md:text-xl">Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent className="px-3 md:px-6">
                    {!isLoading ? (
                        todayClasses.length > 0 ? (
                            <div className="space-y-3 md:space-y-4">
                                {todayClasses.map((routine) => (
                                    <div
                                        key={routine.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 border-b pb-3 md:pb-4 last:border-0 last:pb-0"
                                    >
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <p className="font-medium leading-tight truncate">
                                                {routine.course_catalog?.subject_name}
                                            </p>
                                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                                {routine.section?.batch?.name} • {routine.section?.name}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                                            <div className="bg-secondary px-2 sm:px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap flex items-center gap-1">
                                                <Clock className="w-3 h-3 sm:hidden" />
                                                {routine.start_time?.slice(0, 5)} - {routine.end_time?.slice(0, 5)}
                                            </div>
                                            {routine.room_id && (
                                                <p className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {routine.room_id}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-sm text-muted-foreground">
                                No classes scheduled for today.
                            </div>
                        )
                    ) : (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            Loading schedule...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherDashboard;
