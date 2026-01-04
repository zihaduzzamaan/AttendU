import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
    User,
    LogOut,
    BookOpen,
    Menu,
    GraduationCap
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Footer } from '@/components/ui/Footer';

const StudentLayout = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        {
            title: 'Attendance',
            icon: BookOpen,
            href: '/student/attendance'
        },
        {
            title: 'My Profile',
            icon: User,
            href: '/student/profile'
        }
    ];

    const SidebarContent = ({ mobile = false }) => (
        <>
            <div className="flex h-16 items-center border-b px-6">
                <div className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <span className="truncate">Student Portal</span>
                </div>
            </div>

            <div className="py-4 flex-1">
                <div className="px-3 py-2">
                    <div className="space-y-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.href}
                                to={item.href}
                                onClick={() => mobile && setIsMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`
                                }
                            >
                                <item.icon className="w-5 h-5 mr-3 shrink-0" />
                                {item.title}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t p-4 bg-card/30">
                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Sign Out
                </Button>
            </div>
        </>
    );

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card/50 backdrop-blur-xl flex-col">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                    <SidebarContent mobile />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 w-full">
                {/* Header */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 sm:px-6 backdrop-blur w-full">
                    <div className="flex items-center gap-3 flex-1">
                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden shrink-0"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>

                        <h2 className="text-base sm:text-lg font-semibold truncate">
                            Welcome, {user?.name}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-sm hidden sm:block">
                                <p className="font-medium leading-none truncate max-w-[150px]">{user?.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">Student</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 sm:p-6 max-w-7xl mx-auto flex-1 flex flex-col w-full animate-fade-in">
                    <div className="flex-1">
                        <Outlet />
                    </div>
                    <Footer />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
