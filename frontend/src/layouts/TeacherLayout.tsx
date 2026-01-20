import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarClock,
    Camera,
    History,
    LogOut,
    User,
    Menu,
    GraduationCap,
    ChevronRight,
    Sparkles,
    Bell,
    Search
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Footer } from '@/components/ui/Footer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const TeacherLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
        { icon: Users, label: 'My Classes', path: '/teacher/classes' },
        { icon: CalendarClock, label: 'Routine', path: '/teacher/routine' },
        { icon: Camera, label: 'Take Attendance', path: '/teacher/take-attendance' },
        { icon: History, label: 'History', path: '/teacher/past-attendance' },
    ];

    const SidebarContent = ({ mobile = false }) => (
        <div className="flex flex-col h-full bg-white text-slate-900">
            <div className="h-20 flex items-center px-8 border-b border-slate-100">
                <div>
                    <h1 className="font-black text-xl tracking-tight leading-none text-slate-900">AttendU</h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Teacher Portal</span>
                </div>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                <div className="mb-4 px-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Main Menu</p>
                </div>
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => mobile && setIsMobileMenuOpen(false)}
                        className={({ isActive }) =>
                            `group relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive
                                ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                                {item.label}
                                {isActive && <ChevronRight className="ml-auto w-4 h-4 text-white/50" />}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            <div className="p-6 border-t border-slate-100">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all rounded-xl h-12"
                    onClick={handleLogout}
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-primary/20">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex w-72 border-r border-slate-200 bg-white flex-col fixed h-full z-30">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white border-r border-slate-100">
                    <SheetTitle className="sr-only">Menu</SheetTitle>
                    <SheetDescription className="sr-only">Navigation</SheetDescription>
                    <SidebarContent mobile />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div className="flex-1 lg:ml-72 flex flex-col min-h-screen relative z-10 transition-all duration-300">
                {/* Header */}
                <header className="h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden text-slate-500 hover:bg-slate-50"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </Button>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight hidden sm:block">
                                {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center max-w-md relative mr-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-64 bg-slate-50 border-none rounded-xl py-2 pl-10 text-sm focus:ring-2 focus:ring-primary/20 text-slate-600 outline-none transition-all hidden lg:block"
                            />
                        </div>

                        <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 relative hover:bg-slate-50">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto py-2 px-3 hover:bg-slate-50 rounded-xl flex items-center gap-3 border border-transparent hover:border-slate-100 transition-all">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-black text-slate-800 leading-none">{user?.name || 'Instructor'}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Faculty Portal</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User className="w-4 h-4" />
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 rounded-xl border-slate-100 shadow-xl bg-white" align="end">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-900">{user?.name || 'Instructor'}</span>
                                        <span className="text-xs text-slate-500 font-normal">Faculty Member</span>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer hover:bg-slate-50">
                                    <User className="mr-2 h-4 w-4" /> Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-500 cursor-pointer hover:bg-red-50" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto pb-24 lg:pb-8">
                    <div className="max-w-7xl mx-auto w-full space-y-8">
                        <Outlet />
                        <div className="mt-12 pt-8 border-t border-slate-100">
                            <Footer variant="light" />
                        </div>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-6 left-6 right-6 z-50 h-16 bg-slate-900 rounded-2xl shadow-2xl flex items-center justify-around px-4 border border-white/10 backdrop-blur-lg">
                <NavLink
                    to="/teacher/dashboard"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400 hover:text-white'}`
                    }
                >
                    <LayoutDashboard className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Home</span>
                </NavLink>

                <div className="relative -top-8 px-2">
                    <button
                        onClick={() => navigate('/teacher/take-attendance')}
                        className="w-14 h-14 bg-primary rounded-2xl shadow-xl shadow-primary/40 flex items-center justify-center text-white active:scale-95 transition-transform"
                    >
                        <Camera className="w-8 h-8" />
                    </button>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 whitespace-nowrap">Attend</span>
                </div>

                <NavLink
                    to="/teacher/classes"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-slate-400 hover:text-white'}`
                    }
                >
                    <Users className="w-6 h-6" />
                    <span className="text-[10px] font-bold">Classes</span>
                </NavLink>
            </nav>
        </div>
    );
};

export default TeacherLayout;
