import { Heart } from "lucide-react";

interface FooterProps {
    variant?: 'light' | 'dark';
}

export const Footer = ({ variant = 'dark' }: FooterProps) => {
    const isDark = variant === 'dark';

    return (
        <footer className={`w-full py-6 px-4 border-t mt-auto ${isDark
            ? 'border-white/10 bg-black/50 backdrop-blur-sm'
            : 'border-gray-200 bg-gray-50/80 backdrop-blur-sm'
            }`}>
            <div className={`max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                <div className={`flex items-center gap-1.5 font-medium group transition-colors ${isDark ? 'hover:text-white' : 'hover:text-gray-900'
                    }`}>
                    <span>Developed by</span>
                    <a href="https://www.facebook.com/zeeshanzeehad/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                        Zihad (The Dev)
                    </a>
                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
                </div>
            </div>
        </footer>
    );
};
