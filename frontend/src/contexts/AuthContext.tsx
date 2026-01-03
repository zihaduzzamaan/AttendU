import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, AuthState } from '@/types';
import { supabase } from '@/lib/supabase';
import { api } from '@/services/api';

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

const withTimeout = async <T extends unknown>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync profile and metadata
  const syncProfile = async (sessionUser: any) => {
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      const { data: profile, error } = await withTimeout(
        profilePromise,
        10000,
        "Profile fetch delayed (10s)"
      );

      if (error || !profile) {
        console.warn("Could not fetch profile during sync:", error?.message);
        return;
      }

      let extraData = {};
      try {
        if (profile.role === 'teacher') {
          const teacher = await withTimeout(api.getTeacherByProfileId(profile.id), 4000, "Teacher sync timeout");
          if (teacher) extraData = { teacher_id: teacher.id };
        } else if (profile.role === 'student') {
          const student = await withTimeout(api.getStudentByProfileId(profile.id), 4000, "Student sync timeout");
          if (student) extraData = { student_id: student.id };
        }
      } catch (metaErr) {
        console.warn('⚠️ Metadata fetch failed (non-critical):', metaErr);
      }

      setUser({ ...sessionUser, ...profile, ...extraData });
      setRole(profile.role as UserRole);
      setIsAuthenticated(true);
    } catch (err) {
      console.warn("⚠️ Profile sync delayed or failed (non-critical):", err);
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
        await syncProfile(data.user);
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

      const { data: authData, error } = await withTimeout(
        supabase.auth.signUp(signupOptions),
        15000,
        "Signup attempt timed out (15s)"
      );

      if (error) return { success: false, error: error.message };
      if (!authData.user) return { success: false, error: 'Signup failed' };

      return { success: true, userId: authData.user.id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setRole(null);
      setIsAuthenticated(false);
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
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="font-medium text-lg">Loading Attendance System...</p>
        <p className="text-muted-foreground text-sm">Please wait while we secure your connection.</p>
      </div>
    );
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
