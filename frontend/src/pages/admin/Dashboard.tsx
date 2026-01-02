import { useEffect, useState } from 'react';
import {
    Users,
    GraduationCap,
    BookOpen,
    Layers,
    CalendarCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { toast } from 'sonner';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalStudents: 0,
        totalTeachers: 0,
        totalBatches: 0,
        totalSubjects: 0,
        todaySessions: 0
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

    const statCards = [
        {
            title: 'Total Students',
            value: stats.totalStudents,
            icon: Users,
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
        },
        {
            title: 'Total Teachers',
            value: stats.totalTeachers,
            icon: GraduationCap,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
        },
        {
            title: 'Total Batches',
            value: stats.totalBatches,
            icon: Layers,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
        },
        {
            title: 'Total Subjects',
            value: stats.totalSubjects,
            icon: BookOpen,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
        },
        {
            title: "Total Routines",
            value: stats.todaySessions,
            icon: CalendarCheck,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">
                    System overview and daily statistics.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {statCards.map((stat, index) => (
                    <Card key={index} className="border-border hover:border-primary/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-md ${stat.bg}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {isLoading ? "..." : stat.value}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Active records
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
