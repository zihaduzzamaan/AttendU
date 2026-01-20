import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    User,
    LogOut,
    CalendarRange,
    LayoutDashboard,
    Bell,
    Settings,
    Search,
    ChevronRight,
    GraduationCap,
    Home,
    ScanFace
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Footer } from '@/components/ui/Footer';
import { toast } from 'sonner';

const StudentLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleFaceRegistrationNavigation = () => {
        if ((user as any)?.face_registered) {
            toast.error("Identity Already Registered", {
                description: "Your face biometric is already locked in our system. Please contact your Department Admin to reset your identity if needed.",
                duration: 5000,
            });
            return;
        }
        navigate('/face-registration?mode=update');
    };

    const navItems = [
        {
            title: 'Overview',
            icon: Home,
            href: '/student/attendance'
        },
        {
            title: 'Routine',
            icon: CalendarRange,
            href: '/student/routine'
        },
        {
            title: 'Profile',
            icon: User,
            href: '/student/profile'
        }
    ];

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-72 border-r border-slate-200 bg-white flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
                <div className="flex h-20 items-center px-8 border-b border-slate-100">
                    <div>
                        <h1 className="font-black text-xl tracking-tight text-slate-800 leading-none">AttendU</h1>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Student Portal</span>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                `flex items-center group rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${isActive
                                    ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-1'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                                }`
                            }
                        >
                            <item.icon className={`w-5 h-5 mr-3 transition-colors ${location.pathname === item.href ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} />
                            {item.title}
                            {location.pathname === item.href && (
                                <ChevronRight className="ml-auto w-4 h-4 opacity-50" />
                            )}
                        </NavLink>
                    ))}

                    <div className="pt-8 px-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Quick Links</p>
                        <Button
                            variant="outline"
                            className="w-full justify-start rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-primary/20 group transition-all"
                            onClick={handleFaceRegistrationNavigation}
                        >
                            <ScanFace className="w-4 h-4 mr-2 text-slate-400 group-hover:text-primary" />
                            Update Scan
                        </Button>
                    </div>
                </nav>

                <div className="p-6 border-t border-slate-100">
                    <Button
                        variant="ghost"
                        className="w-full justify-start rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all duration-300"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-72 w-full pb-24 lg:pb-0">
                {/* Modern Header */}
                <header className="sticky top-0 z-30 flex h-20 items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 sm:px-10 shadow-sm">
                    <div className="lg:hidden flex items-center">
                        <h1 className="font-bold text-lg text-slate-800">AttendU</h1>
                    </div>

                    <div className="hidden lg:flex items-center flex-1 max-w-md relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search academic info..."
                            className="w-full bg-slate-50 border-none rounded-xl py-2 pl-10 text-sm focus:ring-2 focus:ring-primary/10 text-slate-600 outline-none transition-all hover:bg-slate-100/50"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-xl text-slate-500 relative hover:bg-slate-50 hover:text-primary transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-auto py-2 px-3 hover:bg-slate-50 rounded-xl flex items-center gap-3 border border-transparent hover:border-slate-100 transition-all">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-black text-slate-800 leading-none">{user?.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">Student Account</p>
                                    </div>
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                        <User className="w-4 h-4" />
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-2xl border-slate-100 shadow-xl p-2">
                                <DropdownMenuLabel className="px-3 pb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">My Account</DropdownMenuLabel>
                                <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={() => navigate('/student/profile')}>
                                    <User className="mr-2 h-4 w-4" /> Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem className="rounded-xl cursor-pointer py-2.5" onClick={handleFaceRegistrationNavigation}>
                                    <ScanFace className="mr-2 h-4 w-4" /> Face Scan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-2 bg-slate-50" />
                                <DropdownMenuItem className="text-red-500 rounded-xl cursor-pointer py-2.5 hover:bg-red-50" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* Content */}
                <div className="px-3 sm:px-10 py-6 max-w-6xl mx-auto min-h-[calc(100vh-80px-100px)]">
                    <Outlet />
                </div>

                <div className="px-4 sm:px-10 pb-10">
                    <Footer variant="light" />
                </div>
            </main>

            {/* Mobile Bottom Navigation - 5 items */}
            <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-50 h-16 bg-slate-900 rounded-2xl shadow-2xl flex items-center justify-around px-2 border border-white/10 backdrop-blur-lg">
                <NavLink
                    to="/student/attendance"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-all duration-300 min-w-[50px] ${isActive ? 'text-primary scale-110' : 'text-slate-400 hover:text-white'}`
                    }
                >
                    <Home className="w-5 h-5" />
                    <span className="text-[9px] font-bold">Home</span>
                </NavLink>

                <NavLink
                    to="/student/routine"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-all duration-300 min-w-[50px] ${isActive ? 'text-primary scale-110' : 'text-slate-400 hover:text-white'}`
                    }
                >
                    <CalendarRange className="w-5 h-5" />
                    <span className="text-[9px] font-bold">Routine</span>
                </NavLink>

                <div className="relative -top-6">
                    <button
                        onClick={handleFaceRegistrationNavigation}
                        className="w-12 h-12 bg-primary rounded-xl shadow-xl shadow-primary/40 flex items-center justify-center text-white active:scale-95 transition-transform"
                    >
                        <ScanFace className="w-7 h-7" />
                    </button>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 whitespace-nowrap">Scan</span>
                </div>

                <NavLink
                    to="/student/profile"
                    className={({ isActive }) =>
                        `flex flex-col items-center gap-1 transition-all duration-300 min-w-[50px] ${isActive ? 'text-primary scale-110' : 'text-slate-400 hover:text-white'}`
                    }
                >
                    <User className="w-5 h-5" />
                    <span className="text-[9px] font-bold">Profile</span>
                </NavLink>

                <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-1 transition-all duration-300 min-w-[50px] text-slate-400 hover:text-red-400"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[9px] font-bold">Sign Out</span>
                </button>
            </nav>
        </div>
    );
};

export default StudentLayout;
