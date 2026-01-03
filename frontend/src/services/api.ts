import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

// Types (Mirroring DB Schema)
export interface Faculty { id: string; name: string; }
export interface Batch { id: string; faculty_id: string; name: string; }
export interface Section { id: string; batch_id: string; name: string; }
export interface Subject { id: string; section_id: string; name: string; code: string; }
export interface Profile { id: string; email: string; name: string; role: UserRole; }

export const api = {
  // Auth
  signUp: async (email: string, password: string, data: any) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: { data }
    });
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  signOut: async () => {
    return await supabase.auth.signOut();
  },

  // Academic Structure
  getFaculties: async () => {
    const { data, error } = await supabase.from('faculties').select('*').order('name');
    if (error) throw error;
    return data as Faculty[];
  },

  createFaculty: async (name: string) => {
    const { data, error } = await supabase.from('faculties').insert([{ name }]).select().single();
    if (error) throw error;
    return data as Faculty;
  },

  getBatches: async (facultyId?: string) => {
    let query = supabase.from('batches').select('*').order('name');
    if (facultyId) query = query.eq('faculty_id', facultyId);
    const { data, error } = await query;
    if (error) throw error;
    return data as Batch[];
  },

  createBatch: async (facultyId: string, name: string) => {
    const { data, error } = await supabase.from('batches').insert([{ faculty_id: facultyId, name }]).select().single();
    if (error) throw error;
    return data as Batch;
  },

  getSections: async (batchId?: string) => {
    let query = supabase.from('sections').select('*').order('name');
    if (batchId) query = query.eq('batch_id', batchId);
    const { data, error } = await query;
    if (error) throw error;
    return data as Section[];
  },

  createSection: async (batchId: string, name: string) => {
    const { data, error } = await supabase.from('sections').insert([{ batch_id: batchId, name }]).select().single();
    if (error) throw error;
    return data as Section;
  },

  getSubjects: async (sectionId?: string) => {
    let query = supabase.from('subjects').select('*').order('name');
    if (sectionId) query = query.eq('section_id', sectionId);
    const { data, error } = await query;
    if (error) throw error;
    return data as Subject[];
  },

  createSubject: async (sectionId: string, name: string, code: string) => {
    const { data, error } = await supabase.from('subjects').insert([{ section_id: sectionId, name, code }]).select().single();
    if (error) throw error;
    return data as Subject;
  },

  // Users
  getProfiles: async (role?: UserRole) => {
    let query = supabase.from('profiles').select('*');
    if (role) query = query.eq('role', role);
    const { data, error } = await query;
    if (error) throw error;
    return data as Profile[];
  },

  getStudents: async () => {
    const { data, error } = await supabase.from('students').select(`
      *,
      profile:profiles!profile_id(email, name, role),
      section:sections(name,
        batch:batches(name, faculty_id)
      )
    `);
    if (error) throw error;
    return data;
  },

  getTeachers: async () => {
    const { data, error } = await supabase
      .from('teachers')
      .select(`
        *,
        profile:profiles!profile_id(email, name, role)
      `);

    if (error) throw error;
    return data;
  },

  getTeacherByProfileId: async (profileId: string) => {
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  getStudentByProfileId: async (profileId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('*, section:sections(*, batch:batches(*))')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  getTeacherAssignments: async (teacherId: string) => {
    const { data, error } = await supabase
      .from('teacher_assignments')
      .select(`
        *,
        subject:subjects(
          *,
          section:sections(
            *,
            batch:batches(*)
          )
        )
      `)
      .eq('teacher_id', teacherId);
    if (error) throw error;
    return data;
  },

  getStudentsBySection: async (sectionId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        profile:profiles!profile_id(email, name),
        face_embedding
      `)
      .eq('section_id', sectionId);
    if (error) throw error;
    return data;
  },

  completeFaceRegistration: async (userId: string, embedding?: number[]) => {
    const { error } = await supabase
      .from('students')
      .update({
        face_registered: true,
        is_active: true,
        face_embedding: embedding ? JSON.stringify(embedding) : null
      })
      .eq('profile_id', userId);
    if (error) throw error;
  },

  // Routines
  getRoutines: async (filters?: { teacher_id?: string; day?: string }) => {
    let query = supabase.from('routines').select(`
      *,
      subject:subjects(
        name, 
        code,
        section:sections(
          name,
          batch:batches(name, faculty_id)
        )
      ),
      teacher:teachers!teacher_id(
        profile:profiles!profile_id(name)
      ) 
    `);

    if (filters?.teacher_id) query = query.eq('teacher_id', filters.teacher_id);
    if (filters?.day) query = query.eq('day_of_week', filters.day);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  createRoutine: async (routine: any) => {
    const { data, error } = await supabase.from('routines').insert([routine]).select().single();
    if (error) throw error;
    return data;
  },

  // Attendance
  markAttendance: async (logs: any[]) => {
    const { data, error } = await supabase.from('attendance_logs').insert(logs).select();
    if (error) throw error;
    return data;
  },

  logAttendance: async (logs: any[]) => {
    const { error } = await supabase.from('attendance_logs').insert(logs);
    if (error) throw error;
  },

  getAttendance: async (filters?: { student_id?: string; subject_id?: string; date?: string }) => {
    let query = supabase.from('attendance_logs').select('*').order('timestamp', { ascending: false });

    if (filters?.student_id) query = query.eq('student_id', filters.student_id);
    if (filters?.subject_id) query = query.eq('subject_id', filters.subject_id);
    if (filters?.date) query = query.eq('date', filters.date);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getAttendanceHistory: async (filters?: { teacher_id?: string; student_id?: string; section_id?: string }) => {
    let query = supabase.from('attendance_logs').select(`
      *,
      student:students(
        student_id,
        profile:profiles(name)
      ),
      routine:routines(
        day_of_week,
        start_time,
        end_time,
        teacher_id
      ),
      subject:subjects(name, code, section_id)
    `).order('date', { ascending: false });

    if (filters.teacher_id) {
      query = query.eq('routine.teacher_id', filters.teacher_id);
    }
    if (filters.student_id) {
      query = query.eq('student_id', filters.student_id);
    }
    if (filters.section_id) {
      query = query.eq('subject.section_id', filters.section_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Delete & Update Helpers
  deleteResource: async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },

  updateResource: async (table: string, id: string, updates: any) => {
    const { error } = await supabase.from(table).update(updates).eq('id', id);
    if (error) throw error;
  },

  getStats: async () => {
    const [students, teachers, batches, subjects, routines] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('teachers').select('*', { count: 'exact', head: true }),
      supabase.from('batches').select('*', { count: 'exact', head: true }),
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
      supabase.from('routines').select('*', { count: 'exact', head: true }),
    ]);

    return {
      totalStudents: students.count || 0,
      totalTeachers: teachers.count || 0,
      totalBatches: batches.count || 0,
      totalSubjects: subjects.count || 0,
      todaySessions: routines.count || 0,
    };
  },

  // Python Backend - Face Recognition API
  // To switch back to local, change this to 'http://localhost:8000'
  registerFaceEmbedding: async (imageBlob: Blob) => {
    const PYTHON_BACKEND = 'https://attendu-full-app.onrender.com';
    const TIMEOUT_MS = 60000; // 60s timeout (Render cold starts can take 30-50s)

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'face.jpg');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(`${PYTHON_BACKEND}/api/face/register`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Face registration failed');
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Request timed out after 60s');
        throw new Error('Connection timed out. Backend might be waking up from sleep (Render free tier). Please try again in 30 seconds.');
      }
      console.error('Error calling Python backend:', error);
      throw error;
    }
  },

  recognizeFaces: async (imageBlob: Blob, knownEmbeddings: Record<string, number[]>) => {
    const PYTHON_BACKEND = 'https://attendu-full-app.onrender.com';

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'capture.jpg');
      formData.append('known_embeddings', JSON.stringify(knownEmbeddings));

      const response = await fetch(`${PYTHON_BACKEND}/api/face/recognize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Face recognition failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling Python backend:', error);
      throw error;
    }
  },

  verifyFace: async (imageBlob: Blob, knownEmbedding: number[]) => {
    const PYTHON_BACKEND = 'https://attendu-full-app.onrender.com';

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'verify.jpg');
      formData.append('known_embedding', JSON.stringify(knownEmbedding));

      const response = await fetch(`${PYTHON_BACKEND}/api/face/verify`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Face verification failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error calling Python backend:', error);
      throw error;
    }
  }
};
