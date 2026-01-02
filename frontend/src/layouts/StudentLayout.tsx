import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    User,
    LogOut,
    BookOpen
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const StudentLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        {
            title: 'Attendance',
            icon: <BookOpen className="w-5 h-5 mr-3" />,
            href: '/student/attendance'
        },
        {
            title: 'My Profile',
            icon: <User className="w-5 h-5 mr-3" />,
            href: '/student/profile'
        }
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground font-sans">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card/50 backdrop-blur-xl transition-transform">
                <div className="flex h-16 items-center border-b px-6">
                    <div className="flex items-center gap-2 font-bold text-xl text-primary">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <span className="text-primary">S</span>
                        </div>
                        Student Portal
                    </div>
                </div>

                <div className="py-4">
                    <div className="px-3 py-2">
                        <div className="space-y-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.href}
                                    to={item.href}
                                    className={({ isActive }) =>
                                        `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`
                                    }
                                >
                                    {item.icon}
                                    {item.title}
                                </NavLink>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-0 w-full border-t p-4 bg-card/30">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur w-full">
                    <div className="flex-1">
                        <h2 className="text-lg font-semibold">Welcome, {user?.name}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-sm">
                                <p className="font-medium leading-none">{user?.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{(user as unknown as { role: string })?.role}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6 max-w-7xl mx-auto animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
