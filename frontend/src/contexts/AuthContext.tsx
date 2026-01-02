import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string>("Initializing...");
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        setInitError("Auth initialization timed out after 10 seconds. Check console and network tab.");
        setLoading(false);
      }
    }, 10000);

    const initAuth = async () => {
      try {
        setDebugInfo("Checking Supabase session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Session fetch error:", sessionError);
          setInitError(`Session error: ${sessionError.message}`);
        }

        if (session?.user) {
          setDebugInfo(`Fetching profile for ${session.user.email}...`);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error("Profile fetch error:", profileError);
            setInitError(`Profile error: ${profileError.message}`);
          }

          if (profile) {
            console.log('✅ Auth init: profile found', profile.role);
            let extraData = {};
            try {
              if (profile.role === 'teacher') {
                const teacher = await api.getTeacherByProfileId(profile.id);
                if (teacher) {
                  console.log('✅ Auth init: teacher metadata found', teacher.id);
                  extraData = { teacher_id: teacher.id };
                }
              } else if (profile.role === 'student') {
                const student = await api.getStudentByProfileId(profile.id);
                if (student) {
                  console.log('✅ Auth init: student metadata found', student.id);
                  extraData = { student_id: student.id };
                }
              }
            } catch (metaErr) {
              console.warn('⚠️ Auth init: failed to fetch metadata', metaErr);
            }
            setUser({ ...session.user, ...profile, ...extraData });
            setRole(profile.role as UserRole);
            setIsAuthenticated(true);
          }
        } else {
          setDebugInfo("No active session found.");
        }
      } catch (error: any) {
        console.error("Auth initialization fatal error:", error);
        setInitError(`Fatal error: ${error.message || JSON.stringify(error)}`);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          console.log('✅ Auth changed: profile found', profile.role);
          let extraData = {};
          try {
            if (profile.role === 'teacher') {
              const teacher = await api.getTeacherByProfileId(profile.id);
              if (teacher) {
                console.log('✅ Auth changed: teacher metadata found', teacher.id);
                extraData = { teacher_id: teacher.id };
              }
            } else if (profile.role === 'student') {
              const student = await api.getStudentByProfileId(profile.id);
              if (student) {
                console.log('✅ Auth changed: student metadata found', student.id);
                extraData = { student_id: student.id };
              }
            }
          } catch (metaErr) {
            console.warn('⚠️ Auth changed: failed to fetch metadata', metaErr);
          }
          setUser({ ...session.user, ...profile, ...extraData });
          setRole(profile.role as UserRole);
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setRole(null);
        setIsAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('🔐 login start:', email);

      const loginPromise = api.signIn(email, password);
      const timeoutPromise = new Promise<{ data: any, error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Login attempt timed out (15s). Check your internet or Supabase status.")), 15000)
      );

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as { data: any, error: any };

      if (error) {
        console.error('❌ login auth error:', error);
        throw error;
      }
      console.log('✅ login auth success:', data.user?.id);

      // After successful auth, verify role if selectedRole was set
      console.log('🔦 fetching profile for role check...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('❌ login profile fetch error:', profileError);
        throw profileError;
      }
      console.log('✅ login profile found:', profile.role);

      if (selectedRole && profile.role !== selectedRole) {
        console.warn('⚠️ login role mismatch:', { selectedRole, actualRole: profile.role });
        await api.signOut();
        return { success: false, error: `This account is not registered as a ${selectedRole}.` };
      }

      console.log('🎉 login complete!');
      return { success: true };
    } catch (err: any) {
      console.error('❌ login process failed:', err);
      return { success: false, error: err.message || 'Login failed' };
    }
  }, [selectedRole]);

  const signup = useCallback(async (data: any): Promise<{ success: boolean; error?: string; userId?: string }> => {
    try {
      // 1. Auth Signup
      const { data: authData, error: authError } = await api.signUp(data.email, data.password, {
        name: data.name,
        role: data.role
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("User creation failed");

      // 2. Create Profile
      console.log('👤 profile insert:', { userId, email: data.email, role: data.role });
      const { error: profileError } = await supabase.from('profiles').insert([{
        id: userId,
        email: data.email,
        name: data.name,
        role: data.role
      }]);
      if (profileError) {
        console.error('❌ profile insert error:', profileError);
        throw profileError;
      }
      console.log('✅ profile insert success');

      // 3. Role specific tables
      if (data.role === 'student') {
        const studentObj = {
          profile_id: userId,
          student_id: data.studentId,
          section_id: data.sectionId || data.section_id, // Support both naming styles
          face_registered: false,
          is_active: false
        };
        console.log('👨‍🎓 student insert:', studentObj);
        const { error: studentError } = await supabase.from('students').insert([studentObj]);
        if (studentError) {
          console.error('❌ student insert error:', studentError);
          throw studentError;
        }
        console.log('✅ student insert success');
        setPendingStudentId(userId);
      } else if (data.role === 'teacher') {
        const teacherObj = {
          profile_id: userId,
          faculty_id: data.facultyId || data.faculty_id,
          employee_id: data.employeeId || data.employee_id,
          is_active: true
        };
        console.log('🍎 teacher insert:', teacherObj);
        const { data: newTeacher, error: teacherError } = await supabase
          .from('teachers')
          .insert([teacherObj])
          .select()
          .single();

        if (teacherError) {
          console.error('❌ teacher insert error:', teacherError);
          throw teacherError;
        }
        console.log('✅ teacher insert success:', newTeacher.id);

        // Teacher assignments
        if (data.assignments && data.assignments.length > 0) {
          const assignments = data.assignments.map((a: any) => ({
            teacher_id: newTeacher.id, // Using the TEACHER UUID, not PROFILE UUID
            subject_id: a.subjectId
          }));
          console.log('📚 assigning subjects:', assignments.length);
          const { error: assignError } = await supabase.from('teacher_assignments').insert(assignments);
          if (assignError) {
            console.error('❌ teacher assignments error:', assignError);
            throw assignError;
          }
          console.log('✅ teacher assignments success');
        }
      }

      return { success: true, userId };
    } catch (err: any) {
      return { success: false, error: err.message || 'Signup failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    await api.signOut();
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
    setSelectedRole(null);
    setPendingStudentId(null);
  }, []);

  const completeFaceStore = useCallback(async (userId: string, embedding?: number[]) => {
    try {
      await api.completeFaceRegistration(userId, embedding);

      // Update local state if the user is currently logged in
      if (user && user.id === userId) {
        setUser({ ...user, face_registered: true, is_active: true });
      }

      return { success: true };
    } catch (err: any) {
      console.error("Face registration completion error:", err);
      return { success: false, error: err.message || 'Failed to complete registration' };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="font-medium">Loading Attendance System...</p>
        </div>
        <div className="mt-4 p-4 rounded bg-muted max-w-md text-xs font-mono">
          <p className="text-muted-foreground">Status: {debugInfo}</p>
          {initError && (
            <p className="text-destructive mt-2">Error: {initError}</p>
          )}
        </div>
        {initError && (
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry Connection
          </button>
        )}
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
