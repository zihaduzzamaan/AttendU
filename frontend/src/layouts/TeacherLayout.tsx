
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarClock,
    Camera,
    History,
    LogOut,
    User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const TeacherLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
        { icon: Users, label: 'Batches', path: '/teacher/batches' },
        { icon: CalendarClock, label: 'Routine', path: '/teacher/routine' },
        { icon: Camera, label: 'Take Attendance', path: '/teacher/take-attendance' },
        { icon: History, label: 'Past Attendance', path: '/teacher/past-attendance' },
    ];

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card flex flex-col fixed h-full z-10">
                <div className="h-16 border-b border-border flex items-center px-6">
                    <span className="text-lg font-bold tracking-tight">Teacher Portal</span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                }`
                            }
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-border">
                    <Button
                        variant="outline"
                        className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10 px-8 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <span>Teacher Portal</span>
                        <span className="text-border">/</span>
                        <span className="text-foreground font-medium">Overview</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-medium leading-none">{user?.name || 'Teacher'}</p>
                            <p className="text-xs text-muted-foreground mt-1">Faculty Member</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-border">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-8 overflow-auto animate-in fade-in duration-500">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default TeacherLayout;
