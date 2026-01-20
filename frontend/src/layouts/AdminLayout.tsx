import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    Users,
    CalendarDays,
    ClipboardCheck,
    Settings,
    LogOut,
    User,
    Menu
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Footer } from '@/components/ui/Footer';

const AdminLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
        { icon: Building2, label: 'Academic Structure', path: '/admin/academic' },
        { icon: Users, label: 'Users', path: '/admin/users' },
        { icon: CalendarDays, label: 'Routines', path: '/admin/routines' },
        { icon: ClipboardCheck, label: 'Attendance', path: '/admin/attendance' },
        { icon: Settings, label: 'Settings', path: '/admin/settings' },
    ];

    const SidebarContent = ({ mobile = false }) => (
        <>
            <div className="h-20 border-b border-border flex items-center px-6">
                <div>
                    <h1 className="font-black text-xl tracking-tight leading-none text-foreground">AttendU</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin Portal</span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => mobile && setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${isActive
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            }`
                        }
                    >
                        <item.icon className="w-4 h-4 shrink-0" />
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
        </>
    );

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-64 border-r border-border bg-card flex-col fixed h-full z-10">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                    <SidebarContent mobile />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen w-full">
                {/* Header */}
                <header className="h-16 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10 px-4 sm:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden shrink-0"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span className="hidden sm:inline">Administration Panel</span>
                            <span className="text-border hidden sm:inline">/</span>
                            <span className="text-foreground font-medium">Overview</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="h-auto py-1 px-3 bg-slate-50/50 rounded-xl flex items-center gap-3 border border-slate-100/50">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-black text-slate-800 leading-none truncate max-w-[150px]">{user?.name || 'Administrator'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Management</p>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <User className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-auto animate-in fade-in duration-500">
                    <div className="flex-1">
                        <Outlet />
                    </div>
                    <Footer variant="light" />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
