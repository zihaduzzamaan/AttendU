import { useEffect, useState } from 'react';
import {
    Users,
    GraduationCap,
    BookOpen,
    Layers,
    CalendarCheck,
    TrendingUp,
    ArrowUpRight,
    Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/services/api';
import { toast } from 'sonner';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell
} from 'recharts';

const AdminDashboard = () => {
    const [stats, setStats] = useState<any>({
        totalStudents: 0,
        totalTeachers: 0,
        totalBatches: 0,
        totalSubjects: 0,
        todaySessions: 0,
        distribution: [],
        attendanceTrend: []
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const data = await api.getStats();
                setStats(data);
            } catch (error) {
                toast.error("Failed to load dashboard stats");
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

    const statCards = [
        {
            title: 'Students',
            value: stats.totalStudents,
            icon: Users,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            desc: 'Registered students'
        },
        {
            title: 'Teachers',
            value: stats.totalTeachers,
            icon: GraduationCap,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            desc: 'Active faculty'
        },
        {
            title: 'Batches',
            value: stats.totalBatches,
            icon: Layers,
            color: 'text-violet-500',
            bg: 'bg-violet-500/10',
            desc: 'Across all depts'
        },
        {
            title: 'Routines',
            value: stats.todaySessions,
            icon: CalendarCheck,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            desc: 'Scheduled sessions'
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6 pb-10 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">University Overview</h2>
                    <p className="text-sm text-muted-foreground">Real-time statistics and academic insights</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-muted/50 p-1 rounded-lg text-xs font-medium">
                    <span className="px-2 py-1 rounded bg-background shadow-sm border">Live View</span>
                    <span className="px-2 text-muted-foreground mr-1 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-emerald-500" />
                        System Active
                    </span>
                </div>
            </div>

            {/* Stats Grid - Compact & Elegant */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {statCards.map((stat, index) => (
                    <Card key={index} className="overflow-hidden border-none shadow-sm bg-card hover:shadow-md transition-all duration-300">
                        <CardHeader className="p-3 sm:p-4 pb-0 flex flex-row items-center justify-between space-y-0">
                            <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color} opacity-80`} />
                            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center bg-muted/30">
                                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-1">
                            <div className="text-xl sm:text-2xl font-bold tracking-tight">
                                {isLoading ? "..." : stat.value}
                            </div>
                            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">
                                {stat.title}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Graphs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">

                {/* Attendance Trend - 3/5 width on Desktop */}
                <Card className="lg:col-span-3 shadow-sm border-none bg-card overflow-hidden">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                Attendance Velocity
                                <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                            </CardTitle>
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">+12.5%</span>
                        </div>
                        <CardDescription>Daily session check-ins for the past week</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-4 h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.1} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Faculty Distribution - 2/5 width on Desktop */}
                <Card className="lg:col-span-2 shadow-sm border-none bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            Faculty Mix
                            <Users className="w-4 h-4 text-blue-500" />
                        </CardTitle>
                        <CardDescription>Student count per department</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 sm:p-4 h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.distribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.1} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '12px' }} />
                                <Bar dataKey="students" radius={[4, 4, 0, 0]} barSize={20}>
                                    {stats.distribution.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="md:col-span-2 shadow-sm border-none bg-indigo-600 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <GraduationCap className="w-32 h-32" />
                    </div>
                    <CardHeader>
                        <CardTitle className="text-white">Quick Action Center</CardTitle>
                        <CardDescription className="text-indigo-100">Common administrative tasks</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none text-xs h-8">Enroll Student</Button>
                        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none text-xs h-8">Add Routine</Button>
                        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none text-xs h-8">Update Catalog</Button>
                        <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none text-xs h-8">System Settings</Button>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-none">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Sync</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">Database Sync</p>
                                <p className="text-[10px] text-muted-foreground">Last updated 2 mins ago</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">Python Backend</p>
                                <p className="text-[10px] text-muted-foreground">Connected & Stable</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
