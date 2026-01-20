import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, AuthState } from '@/types';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthContextType extends AuthState {
  loading: boolean;
  selectedRole: UserRole | null;
  setSelectedRole: (role: UserRole | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: any) => Promise<{ success: boolean; error?: string; userId?: string }>;
  logout: () => void;
  pendingStudentId: string | null;
  setPendingStudentId: (id: string | null) => void;
  completeFaceRegistration: (userId: string, embedding?: number[]) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const withTimeout = async <T extends unknown>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise as Promise<T>, timeoutPromise]);
};

export const LoadingScreen = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    "Register your face once...",
    "Teacher takes a class photo...",
    "Boom! Attendance is done.",
    "No more manual roll calls...",
    "No more shouting in class.",
    "Revolutionizing tracking..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-black text-white">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12">
        {/* Modern Loading Animation */}
        <div className="relative h-24 w-24 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 rounded-full border border-indigo-500/30"
          />
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl"
          />
          <div className="relative flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  height: [8, 24, 8],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut"
                }}
                className="w-1.5 bg-indigo-500 rounded-full"
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 text-center px-6">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent"
          >
            AttendU
          </motion.h1>

          <div className="h-8 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="text-indigo-400 font-bold text-sm tracking-wide uppercase"
              >
                {messages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 flex items-center gap-3 rounded-full bg-white/5 px-6 py-2.5 border border-white/10 backdrop-blur-md"
        >
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
            Initializing System
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-10 left-0 w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] text-white/20 font-black">
          Developed by <a href="https://www.facebook.com/zeeshanzeehad/" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">Zihad (The Dev)</a>
        </p>
      </div>
    </div>
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<any>(() => {
    const cached = localStorage.getItem('auth_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [role, setRoleState] = useState<UserRole | null>(() => {
    return localStorage.getItem('auth_role') as UserRole | null;
  });
  const [isAuthenticated, setIsAuthenticatedState] = useState<boolean>(() => {
    return localStorage.getItem('auth_isAuthenticated') === 'true';
  });

  const setUser = (user: any) => {
    setUserState(user);
    if (user) localStorage.setItem('auth_user', JSON.stringify(user));
    else localStorage.removeItem('auth_user');
  };

  const setRole = (role: UserRole | null) => {
    setRoleState(role);
    if (role) localStorage.setItem('auth_role', role);
    else localStorage.removeItem('auth_role');
  };

  const setIsAuthenticated = (isAuth: boolean) => {
    setIsAuthenticatedState(isAuth);
    localStorage.setItem('auth_isAuthenticated', isAuth.toString());
  };

  const [selectedRole, setSelectedRoleState] = useState<UserRole | null>(() => {
    return localStorage.getItem('selectedRole') as UserRole | null;
  });

  const setSelectedRole = (role: UserRole | null) => {
    setSelectedRoleState(role);
    if (role) {
      localStorage.setItem('selectedRole', role);
    } else {
      localStorage.removeItem('selectedRole');
    }
  };
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(!isAuthenticated); // Optimistic loading if cached
  const syncLock = React.useRef(false);

  const syncProfile = async (sessionUser: any, retryCount = 0): Promise<boolean> => {
    if (syncLock.current) return true;
    syncLock.current = true;

    try {
      const { data: profile, error } = (await withTimeout(
        supabase
          .from('profiles')
          .select('*, students(id, face_registered, section_id), teachers(id)')
          .eq('id', sessionUser.id)
          .maybeSingle(),
        5000,
        "Profile fetch delayed"
      )) as any;

      if (error || !profile) {
        if (retryCount < 2) {
          syncLock.current = false;
          await new Promise(resolve => setTimeout(resolve, 200));
          return await syncProfile(sessionUser, retryCount + 1);
        }
        return false;
      }

      const role = profile.role as UserRole;
      let extraData: any = {};

      if (role === 'student' && profile.students?.[0]) {
        extraData = {
          student_id: profile.students[0].id,
          section_id: profile.students[0].section_id,
          face_registered: profile.students[0].face_registered
        };
      } else if (role === 'teacher' && profile.teachers?.[0]) {
        extraData = {
          teacher_id: profile.teachers[0].id
        };
      }

      setUser({
        ...sessionUser,
        ...profile,
        ...extraData,
        students: undefined,
        teachers: undefined
      });
      setRole(role);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      return false;
    } finally {
      syncLock.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const loadingFailsafe = setTimeout(() => {
      if (mounted && loading) setLoading(false);
    }, 12000);

    const handleAuthChange = async (session: any) => {
      if (!mounted) return;

      if (session) {
        await syncProfile(session.user);
      } else {
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
      }

      if (mounted) {
        setLoading(false);
        initialized = true;
      }
    };

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && !initialized) {
          await handleAuthChange(session);
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (mounted) {
        await handleAuthChange(session);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(loadingFailsafe);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        "Login timeout"
      );

      if (error) return { success: false, error: error.message };

      if (data.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();

        if (profile && selectedRole && profile.role !== selectedRole) {
          await supabase.auth.signOut();
          return {
            success: false,
            error: `Access Denied: You are a ${profile.role}.`
          };
        }

        const synced = await syncProfile(data.user);
        if (!synced) return { success: false, error: "Profile sync failed" };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const signup = async (data: any) => {
    try {
      const email = data.email.trim();
      const password = data.password;

      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              name: data.name,
              role: data.role
            }
          }
        }),
        15000,
        "Signup timeout"
      );

      if (authError) {
        if (authError.message.includes("already registered")) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

          if (!signInError && signInData.user) {
            const { data: profile } = await supabase.from('profiles').select('id').eq('id', signInData.user.id).maybeSingle();

            if (!profile) {
              const repairUserId = signInData.user.id;
              const { error: pErr } = await supabase.from('profiles').insert([{ id: repairUserId, email, name: data.name, role: data.role }]);
              if (pErr) return { success: false, error: "Repair failed (profile): " + pErr.message };

              if (data.role === 'student') {
                await supabase.from('students').insert([{ profile_id: repairUserId, student_id: data.studentId, section_id: data.section_id, is_active: true }]);
              } else if (data.role === 'teacher') {
                await supabase.from('teachers').insert([{ profile_id: repairUserId, faculty_id: data.facultyId, is_active: true }]);
              }

              await syncProfile(signInData.user);
              return { success: true, userId: repairUserId };
            }
          }
          return { success: false, error: "This email is already registered. Please login instead." };
        }
        return { success: false, error: authError.message };
      }
      if (!authData.user) return { success: false, error: 'Signup failed' };

      const userId = authData.user.id;
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: userId, email: data.email, name: data.name, role: data.role }]);

      if (profileError) return { success: false, error: profileError.message };

      if (data.role === 'student') {
        await supabase.from('students').insert([{
          profile_id: userId,
          student_id: data.studentId,
          section_id: data.section_id,
          is_active: true
        }]);
      } else if (data.role === 'teacher') {
        await supabase.from('teachers').insert([{
          profile_id: userId,
          faculty_id: data.facultyId,
          is_active: true
        }]);
      }

      return { success: true, userId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    // 1. Immediately clear memory state
    setUserState(null);
    setRoleState(null);
    setIsAuthenticatedState(false);
    setSelectedRoleState(null);

    // 2. Aggressively clear ALL relevant localStorage keys
    const keysToRemove = [
      'auth_user',
      'auth_role',
      'auth_isAuthenticated',
      'selectedRole',
      'sb-attendance-auth-token' // Standard Supabase auth token key
    ];

    // Also clear all application cache keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('cache_') || key.startsWith('auth_') || key.includes('supabase.auth'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(k => localStorage.removeItem(k));

    try {
      // 3. Force sign out from Supabase (global scope to clear all sessions)
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Signout error:", err);
    } finally {
      // 4. Force a hard reload to the home page to clear any in-memory state or listeners
      window.location.href = '/';
    }
  };

  const completeFaceStore = async (userId: string, embedding?: number[]) => {
    try {
      const updateData: any = {
        face_registered: true,
        face_embedding: embedding ? JSON.stringify(embedding) : null
      };

      const { error } = await supabase.from('students').update(updateData).eq('profile_id', userId);
      if (error) throw error;

      // Update local state so the app knows the face is registered
      if (user && user.id === userId) {
        const updatedUser = { ...user, face_registered: true };
        setUser(updatedUser);
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  if (loading) return <LoadingScreen />;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        isAuthenticated,
        selectedRole,
        setSelectedRole,
        login,
        signup,
        logout,
        pendingStudentId,
        setPendingStudentId,
        completeFaceRegistration: completeFaceStore,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
