import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, AuthState } from '@/types';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';
import { GraduationCap } from 'lucide-react';

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
  }, []);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-background">
      <div className="absolute top-1/4 -left-20 h-72 w-72 animate-blob rounded-full bg-primary/10 blur-3xl filter opacity-70"></div>
      <div className="absolute top-1/3 -right-20 h-72 w-72 animate-blob animation-delay-2000 rounded-full bg-secondary/10 blur-3xl filter opacity-70"></div>
      <div className="absolute -bottom-20 left-1/2 h-72 w-72 animate-blob animation-delay-4000 rounded-full bg-primary/5 blur-3xl filter opacity-70"></div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-primary shadow-2xl shadow-primary/40 transform transition-transform hover:scale-105 active:scale-95 duration-500">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 text-center px-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            AttendU
          </h1>
          <div className="h-6 flex items-center justify-center">
            <p className="animate-slide-up text-primary font-medium tracking-wide">
              {messages[messageIndex]}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-full bg-muted/50 px-4 py-2 border border-border/50 backdrop-blur-sm">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
            Initializing System
          </span>
        </div>
      </div>

      <div className="absolute bottom-10 left-0 w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-bold">
          Developed by Zihad (The Dev)
        </p>
      </div>
    </div>
  );
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [loading, setLoading] = useState(true);
  const syncLock = React.useRef(false);

  const syncProfile = async (sessionUser: any, retryCount = 0): Promise<boolean> => {
    if (syncLock.current) return true;
    syncLock.current = true;

    try {
      // console.log("🔄 Syncing profile for:", sessionUser.email);
      const { data: profile, error } = (await withTimeout(
        supabase
          .from('profiles')
          .select('*, students(id, face_registered), teachers(id)')
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
        // Cleanup nested arrays for cleaner user object
        students: undefined,
        teachers: undefined
      });
      setRole(role);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      // console.warn("⚠️ Profile sync failed:", err);
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
      // console.log("🚀 Attempting Signup:", { email, role: data.role, name: data.name });

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
        // console.error("❌ Supabase Auth Signup Error:", authError);
        // Recovery logic for broken accounts (Auth exists but Profile doesn't)
        if (authError.message.includes("already registered")) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

          if (!signInError && signInData.user) {
            const { data: profile } = await supabase.from('profiles').select('id').eq('id', signInData.user.id).maybeSingle();

            if (!profile) {
              // console.log("🛠️ Repairing broken account (missing profile)...");
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
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  const completeFaceStore = async (userId: string, embedding?: number[]) => {
    try {
      let updateData: any = { face_registered: true };
      if (embedding) updateData.face_embedding = embedding;
      const { error } = await supabase.from('students').update(updateData).eq('profile_id', userId);
      if (error) throw error;
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
