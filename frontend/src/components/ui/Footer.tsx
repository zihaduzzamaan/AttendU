import { Heart } from "lucide-react";

export const Footer = () => {
    return (
        <footer className="w-full py-6 px-4 border-t bg-background/50 backdrop-blur-sm mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} University Attendance System. All rights reserved.</p>
                <div className="flex items-center gap-1.5 font-medium group transition-colors hover:text-foreground">
                    <span>Developed by</span>
                    <span className="text-primary font-bold">Zihad (the dev)</span>
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                </div>
            </div>
        </footer>
    );
};
