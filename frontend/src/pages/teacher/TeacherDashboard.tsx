import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, CheckCircle } from "lucide-react";
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

            // 2. Count attendance logs for today (simulated or real query)
            // For now, let's just count how many students have logs today for teacher's subjects
            // This is a bit complex for a single query, but we can approximate
            const todayDate = new Date().toISOString().split('T')[0];
            // Since we don't have a "getTeacherAttendanceStats" method yet, we'll fetch logs for my subjects
            // Alternatively, just show 0 or fetch recent logs

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
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Assigned Classes
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.assignedCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Total subject-batches assigned
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Today's Routine
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.todayCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Classes scheduled for today
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Attendance Taken
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.attendanceTaken}</div>
                        <p className="text-xs text-muted-foreground">
                            Sessions recorded today
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Today's Schedule List */}
            <Card className="col-span-1">
                <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    {!isLoading ? (
                        todayClasses.length > 0 ? (
                            <div className="space-y-4">
                                {todayClasses.map((routine) => (
                                    <div key={routine.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div className="space-y-1">
                                            <p className="font-medium leading-none">
                                                {routine.subject?.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {routine.subject?.section?.batch?.name} • {routine.subject?.section?.name}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-secondary px-2.5 py-0.5 rounded-md text-sm font-medium">
                                                {routine.start_time?.slice(0, 5)} - {routine.end_time?.slice(0, 5)}
                                            </div>
                                            {routine.room_id && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Room: {routine.room_id}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 text-muted-foreground">
                                No classes scheduled for today.
                            </div>
                        )
                    ) : (
                        <div className="text-center py-4 text-muted-foreground">
                            Loading schedule...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TeacherDashboard;
