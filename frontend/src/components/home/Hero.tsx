import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Github, Facebook, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Hero() {
    return (
        <div className="relative h-screen w-full overflow-hidden bg-black">
            {/* Grid Background */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
            linear-gradient(rgba(100, 100, 100, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 100, 100, 0.15) 1px, transparent 1px)
          `,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Main Content - Centered with bottom padding for footer */}
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 pb-16 sm:px-6 sm:pb-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center"
                >
                    {/* Headline */}
                    <h1 className="mb-6 text-4xl font-black uppercase leading-[0.9] tracking-tight text-white sm:mb-8 sm:text-5xl md:mb-8 md:text-6xl lg:mb-10 lg:text-7xl xl:text-8xl">
                        Face Recognition
                        <br />
                        Attendance System
                    </h1>

                    {/* Description */}
                    <p className="mx-auto mb-6 max-w-2xl px-2 text-sm leading-relaxed text-gray-400 sm:mb-8 sm:px-4 sm:text-base md:mb-8 md:text-base lg:mb-10 lg:text-lg">
                        AI-powered biometric attendance tracking. Instant verification, zero manual entries, complete automation for educational institutions.
                    </p>

                    {/* CTA Button */}
                    <Link to="/role-selection" className="mt-2 inline-block sm:mt-3 md:mt-4 lg:mt-6">
                        <Button
                            size="lg"
                            className="h-11 px-6 text-xs font-bold uppercase tracking-wider hover:bg-indigo-700 sm:h-12 sm:px-8 sm:text-sm md:h-13 md:px-10 md:text-base lg:h-14 lg:px-12 lg:text-lg"
                        >
                            Get Started
                        </Button>
                    </Link>
                </motion.div>
            </div>

            {/* Footer - Integrated */}
            <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-black/50 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
                <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-4 sm:grid-cols-3">
                    {/* Left - Copyright */}
                    <div className="order-2 text-center sm:order-1 sm:text-left">
                        <p className="text-[10px] text-gray-500 sm:text-xs">
                            © {new Date().getFullYear()} AttendU. All rights reserved.
                        </p>
                    </div>

                    {/* Center - Credits */}
                    <div className="order-1 flex items-center justify-center gap-2 sm:order-2">
                        <span className="text-[10px] font-medium tracking-wider uppercase text-gray-500 sm:text-[11px]">
                            Developed by
                        </span>
                        <motion.a
                            href="https://www.facebook.com/zeeshanzeehad/"
                            target="_blank"
                            rel="noopener noreferrer"
                            initial={{ opacity: 0.5 }}
                            animate={{
                                opacity: [0.8, 1, 0.8],
                                textShadow: [
                                    "0 0 4px rgba(99, 102, 241, 0.2)",
                                    "0 0 15px rgba(99, 102, 241, 0.8)",
                                    "0 0 4px rgba(99, 102, 241, 0.2)"
                                ],
                                scale: [1, 1.05, 1]
                            }}
                            transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="text-[12px] font-black tracking-widest uppercase text-white sm:text-[14px] cursor-pointer"
                            style={{ fontFamily: "'Outfit', sans-serif" }}
                        >
                            Zihad <span className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">(The dev)</span>
                        </motion.a>
                    </div>

                    {/* Right - Social Links */}
                    <div className="order-3 flex items-center justify-center gap-6 sm:justify-end">
                        <a
                            href="https://github.com/zeehadzeeshan"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 transition-all duration-300 hover:text-white hover:scale-110"
                        >
                            <Github className="h-4 w-4 sm:h-5 sm:w-5" />
                        </a>
                        <a
                            href="https://www.facebook.com/zeeshanzeehad/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 transition-all duration-300 hover:text-white hover:scale-110"
                        >
                            <Facebook className="h-4 w-4 sm:h-5 sm:w-5" />
                        </a>
                        <a
                            href="https://www.linkedin.com/in/md-zihaduzzaman"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 transition-all duration-300 hover:text-white hover:scale-110"
                        >
                            <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
