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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync profile and metadata
  const syncProfile = async (sessionUser: any, retryCount = 0): Promise<boolean> => {
    try {
      console.log(`Syncing profile for ${sessionUser.email} (Attempt ${retryCount + 1})...`);

      const { data: profile, error } = (await withTimeout(
        supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle(),
        10000,
        "Profile fetch delayed (10s)"
      )) as any;

      if (error || !profile) {
        // If it's a new signup, it might take a second for the profile record to appear
        if (retryCount < 2) {
          console.log("Profile not found yet, retrying in 2 seconds...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          return await syncProfile(sessionUser, retryCount + 1);
        }
        console.warn("Could not fetch profile during sync:", error?.message || "Profile not found after retries");
        return false;
      }

      let extraData = {};
      try {
        if (profile.role === 'teacher') {
          const teacher = await withTimeout(api.getTeacherByProfileId(profile.id), 5000, "Teacher sync timeout");
          if (teacher) extraData = { teacher_id: teacher.id };
        } else if (profile.role === 'student') {
          const student = await withTimeout(api.getStudentByProfileId(profile.id), 5000, "Student sync timeout");
          if (student) extraData = { student_id: student.id };
        }
      } catch (metaErr) {
        console.warn('⚠️ Metadata fetch failed (non-critical):', metaErr);
      }

      setUser({ ...sessionUser, ...profile, ...extraData });
      setRole(profile.role as UserRole);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      console.warn("⚠️ Profile sync delayed or failed:", err);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Fail-safe: Ensure the loading screen clears after 8 seconds no matter what
    const loadingFailsafe = setTimeout(() => {
      if (mounted && loading) {
        console.warn("🐢 Auth initialization taking longer than expected, overriding loading screen.");
        setLoading(false);
      }
    }, 15000);

    const init = async () => {
      try {
        // Use a 10s race for the initial session check
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: any } }>((_, reject) =>
          setTimeout(() => reject(new Error("Session check timed out")), 10000)
        );

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (mounted) {
          if (session) {
            console.log("Session found on init, syncing profile...");
            // Non-blocking sync for initial load to avoid hanging the screen
            syncProfile(session.user).finally(() => {
              if (mounted) setLoading(false);
            });
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        console.warn("⚠️ Initial session probe was slow:", err);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event, session?.user?.email);
      if (session) {
        await syncProfile(session.user);
      } else {
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(loadingFailsafe);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("login start:", email);
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        "Login attempt timed out (15s). Check your internet or Supabase status."
      );

      if (error) return { success: false, error: error.message };

      if (data.user) {
        // Role Validation: Fetch profile BEFORE final login success
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();

        if (profile && selectedRole && profile.role !== selectedRole) {
          // Mismatch! Sign out immediately and return friendly error
          await supabase.auth.signOut();
          return {
            success: false,
            error: `Access Denied: You are registered as a ${profile.role}. Please log in through the ${profile.role} portal.`
          };
        }

        const synced = await syncProfile(data.user);
        if (!synced) {
          return { success: false, error: "Authenticated, but could not sync your profile data. Please refresh and try again." };
        }
      }
      return { success: true };
    } catch (error: any) {
      console.error("login process failed:", error);
      return { success: false, error: error.message };
    }
  };


  const signup = async (data: any) => {
    try {
      const signupOptions: any = {
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            role: data.role,
          }
        }
      };

      // 1. Register in Supabase Auth
      const { data: authData, error: authError } = await withTimeout(
        supabase.auth.signUp(signupOptions),
        15000,
        "Signup attempt timed out (15s)"
      );

      if (authError) return { success: false, error: authError.message };
      if (!authData.user) return { success: false, error: 'Signup failed' };

      const userId = authData.user.id;

      // 2. Create Profile Record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: data.email,
          name: data.name,
          role: data.role
        }]);

      if (profileError) {
        console.error("Profile creation failed:", profileError);
        return { success: false, error: `Auth success, but profile creation failed: ${profileError.message}` };
      }

      // 3. Create Role-Specific Records
      if (data.role === 'student') {
        const { error: studentError } = await supabase
          .from('students')
          .insert([{
            profile_id: userId,
            student_id: data.studentId, // Roll No
            section_id: data.section_id,
            is_active: true
          }]);

        if (studentError) {
          console.error("Student record creation failed:", studentError);
          return { success: false, error: `Student data error: ${studentError.message}` };
        }
      } else if (data.role === 'teacher') {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .insert([{
            profile_id: userId,
            faculty_id: data.facultyId,
            is_active: true
          }])
          .select()
          .single();

        if (teacherError) {
          console.error("Teacher record creation failed:", teacherError);
          return { success: false, error: `Teacher data error: ${teacherError.message}` };
        }

        // 4. Create Teacher Assignments if provided
        if (data.assignments && data.assignments.length > 0) {
          const assignments = data.assignments.map((a: any) => ({
            teacher_id: teacherData.id,
            subject_id: a.subjectId
          }));

          const { error: assignError } = await supabase
            .from('teacher_assignments')
            .insert(assignments);

          if (assignError) {
            console.warn("Teacher assignments failed:", assignError);
            // Non-critical: we continue even if assignments fail, user can add them later
          }
        }
      }

      return { success: true, userId };
    } catch (error: any) {
      console.error("Signup process exception:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    // 1. Clear local state immediately for instant UI response
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);

    // 2. Perform background signout
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

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('profile_id', userId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }


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

const LoadingScreen = () => {
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
      {/* Dynamic Animated Blobs Background */}
      <div className="absolute top-1/4 -left-20 h-72 w-72 animate-blob rounded-full bg-primary/10 blur-3xl filter opacity-70"></div>
      <div className="absolute top-1/3 -right-20 h-72 w-72 animate-blob animation-delay-2000 rounded-full bg-secondary/10 blur-3xl filter opacity-70"></div>
      <div className="absolute -bottom-20 left-1/2 h-72 w-72 animate-blob animation-delay-4000 rounded-full bg-primary/5 blur-3xl filter opacity-70"></div>

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Pulsing Logo Container */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-primary shadow-2xl shadow-primary/40 transform transition-transform hover:scale-105 active:scale-95 duration-500">
            <GraduationCap className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Text Content */}
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            AttendU
          </h1>
          <div className="h-6 flex items-center justify-center">
            <p className="animate-slide-up text-primary font-medium tracking-wide">
              {messages[messageIndex]}
            </p>
          </div>
          <p className="mt-2 text-muted-foreground text-sm max-w-[250px] leading-relaxed">
            Revolutionizing academic tracking with advanced AI.
          </p>
        </div>

        {/* Progress Spinner (Subtle) */}
        <div className="mt-4 flex items-center gap-3 rounded-full bg-muted/50 px-4 py-2 border border-border/50 backdrop-blur-sm">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
            Initializing System
          </span>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-10 left-0 w-full text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-bold">
          Developed by Zihad (The Dev)        </p>
      </div>
    </div>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
