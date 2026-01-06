import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

// Types (Mirroring DB Schema)
export interface Faculty { id: string; name: string; }
export interface Batch { id: string; faculty_id: string; name: string; current_semester: number; is_graduated: boolean; }
export interface Section { id: string; batch_id: string; name: string; }
export interface CourseCatalogItem {
  id: string;
  faculty_id: string;
  semester_level: number;
  subject_name: string;
  subject_code: string;
  is_lab: boolean;
}
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

  endSemester: async (deptId: string) => {
    const { error } = await supabase.rpc('end_semester', { dept_id: deptId });
    if (error) throw error;
  },

  // === REFACTORED: SUBJECTS & CATALOG ===

  // Get Catalog Items (Global List)
  getCourseCatalog: async (facultyId?: string, semester?: number) => {
    let query = supabase.from('course_catalog').select('*, faculty:faculties(name)').order('semester_level').order('subject_name');
    if (facultyId) query = query.eq('faculty_id', facultyId);
    if (semester) query = query.eq('semester_level', semester);
    const { data, error } = await query;
    if (error) throw error;
    return data as CourseCatalogItem[];
  },

  createCatalogSubject: async (facultyId: string, semester: number, name: string, code: string) => {
    const { data, error } = await supabase.from('course_catalog').insert([{ faculty_id: facultyId, semester_level: semester, subject_name: name, subject_code: code }]).select().single();
    if (error) throw error;
    return data;
  },

  deleteCatalogSubject: async (id: string) => {
    const { error } = await supabase.from('course_catalog').delete().eq('id', id);
    if (error) throw error;
  },

  // Used by Teacher Assignment / Routines to find what subjects can be taught to a text
  getSubjectsForSection: async (sectionId: string) => {
    // 1. Get Section -> Batch info to know semester and faculty
    const { data: section, error: secError } = await supabase
      .from('sections')
      .select('batch_id, batch:batches(faculty_id, current_semester)')
      .eq('id', sectionId)
      .single();

    if (secError) throw secError;
    if (!section || !section.batch) return [];

    const batch = section.batch as any; // Type assertion

    // 2. Fetch Catalog items for that Faculty + Semester
    const { data, error } = await supabase
      .from('course_catalog')
      .select('*')
      .eq('faculty_id', batch.faculty_id)
      .eq('semester_level', batch.current_semester)
      .order('subject_name');

    if (error) throw error;
    return data as CourseCatalogItem[];
  },

  getSubjects: async (sectionId: string) => {
    const catalog = await api.getSubjectsForSection(sectionId);
    return catalog.map(c => ({
      id: c.id,
      name: c.subject_name,
      code: c.subject_code
    }));
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
        batch:batches(name, faculty_id, current_semester)
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
      .select('*, section:sections(*, batch:batches(*, faculty:faculties(name)))')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  getTeacherAssignments: async (teacherId: string) => {
    // Updated to use catalog and sections directly
    const { data, error } = await supabase
      .from('teacher_assignments')
      .select(`
        *,
        course_catalog:course_catalog_id (*),
        section:sections(
          *,
          batch:batches(*)
        )
      `)
      .eq('teacher_id', teacherId);
    if (error) throw error;
    // Map it to a cleaner structure if needed, or update frontend to use .course_catalog.subject_name
    return data;
  },

  createTeacherAssignment: async (teacherId: string, sectionId: string, catalogId: string) => {
    const { data, error } = await supabase
      .from('teacher_assignments')
      .insert([{ teacher_id: teacherId, section_id: sectionId, course_catalog_id: catalogId }])
      .select(`
        *,
        course_catalog:course_catalog_id (*),
        section:sections(
          *,
          batch:batches(*)
        )
      `)
      .single();
    if (error) throw error;
    return data;
  },

  deleteTeacherAssignment: async (assignmentId: string) => {
    const { error } = await supabase
      .from('teacher_assignments')
      .delete()
      .eq('id', assignmentId);
    if (error) throw error;
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
      course_catalog:course_catalog_id (
        subject_name,
        subject_code
      ),
      section:sections(
          name,
          batch:batches(name, faculty_id, current_semester)
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

  getAttendance: async (filters?: { student_id?: string; routine_id?: string; date?: string }) => {
    let query = supabase.from('attendance_logs').select('*').order('created_at', { ascending: false });

    if (filters?.student_id) query = query.eq('student_id', filters.student_id);
    // Updated: Attendance logs now link to routines, which imply subjects.
    // If we need to filter by 'subject', we have to filter by routines that have that subject.
    // But logs usually just filter by routine_id (session) or date.
    if (filters?.routine_id) query = query.eq('routine_id', filters.routine_id);
    // if (filters?.date) ... Date is inside created_at timestamp usually, handling that might be complex if not just 'eq'

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getAttendanceHistory: async (filters?: { teacher_id?: string; student_id?: string; section_id?: string }) => {
    let query = supabase.from('attendance_logs').select(`
      *,
      student:students(
        id,
        student_id,
        profile:profiles(name)
      ),
      routine:routines(
        day_of_week,
        start_time,
        end_time,
        course_catalog:course_catalog_id(subject_name, subject_code),
        section:sections(name, batch:batches(name))
      ),
      course_catalog:course_catalog_id(subject_name, subject_code),
      section:sections(name, batch:batches(name))
    `).order('created_at', { ascending: false });

    if (filters?.teacher_id) {
      // Filter by routine teacher OR manual teacher
      query = query.or(`teacher_id.eq.${filters.teacher_id},routine.teacher_id.eq.${filters.teacher_id}`);
    }

    if (filters?.student_id) {
      query = query.eq('student_id', filters.student_id);
    }

    if (filters?.section_id) {
      // Filter by routine section OR manual section
      query = query.or(`section_id.eq.${filters.section_id},routine.section_id.eq.${filters.section_id}`);
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
    const [students, teachers, batches, catalog, routines] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('teachers').select('*', { count: 'exact', head: true }),
      supabase.from('batches').select('*', { count: 'exact', head: true }),
      supabase.from('course_catalog').select('*', { count: 'exact', head: true }),
      supabase.from('routines').select('*', { count: 'exact', head: true }),
    ]);

    // Fetch student distribution by faculty
    const { data: studentDist } = await supabase
      .from('students')
      .select('id, section:sections(batch:batches(faculty:faculties(name)))');

    const distribution: Record<string, number> = {};
    studentDist?.forEach((s: any) => {
      const fName = s.section?.batch?.faculty?.name || 'Other';
      distribution[fName] = (distribution[fName] || 0) + 1;
    });

    const chartData = Object.entries(distribution).map(([name, count]) => ({
      name,
      students: count
    }));

    return {
      totalStudents: students.count || 0,
      totalTeachers: teachers.count || 0,
      totalBatches: batches.count || 0,
      totalSubjects: catalog.count || 0,
      todaySessions: routines.count || 0,
      distribution: chartData,
      attendanceTrend: [
        { day: 'Mon', count: 45 },
        { day: 'Tue', count: 52 },
        { day: 'Wed', count: 48 },
        { day: 'Thu', count: 61 },
        { day: 'Fri', count: 55 },
        { day: 'Sat', count: 32 },
        { day: 'Sun', count: 12 }
      ]
    };
  },


  // Python Backend - Face Recognition API
  // To switch back to local, change this to 'http://localhost:8000'
  registerFaceEmbedding: async (imageBlob: Blob) => {
    const PYTHON_BACKEND = 'https://arefintitly-attendu-server.hf.space';
    const TIMEOUT_MS = 60000; // 60s timeout (Render cold starts can take 30-50s)

    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'face.jpg');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      console.log(`📤 Sending face registration request (Blob size: ${imageBlob.size} bytes)...`);
      const response = await fetch(`${PYTHON_BACKEND}/api/face/register`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Registration API failed (${response.status}):`, errorText);
        throw new Error('Face registration failed. Please ensure your face is well-lit and clear.');
      }

      const result = await response.json();
      console.log('✅ Registration API response:', result);
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

  recognizeFaces: async (imageBlob: Blob) => {
    // UPDATE THIS URL after creating your Hugging Face Space
    // Format: https://[username]-[spacename].hf.space
    const PYTHON_BACKEND = 'https://arefintitly-attendu-server.hf.space';

    try {
      if (!(imageBlob instanceof Blob)) {
        console.error('❌ recognizeFaces: parameter 1 is not a Blob', imageBlob);
        throw new Error('Internal Error: Invalid image data captured.');
      }
      const formData = new FormData();
      formData.append('image', imageBlob, 'capture.jpg');

      console.log(`📤 Sending recognition request (Image: ${imageBlob.size} bytes)`);
      const response = await fetch(`${PYTHON_BACKEND}/api/face/recognize`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Recognition API failed (${response.status}):`, errorText);
        throw new Error('Face recognition service is currently unavailable.');
      }

      const result = await response.json();
      console.log('✅ Recognition API response (Multi-Face):', result);

      return {
        detected_faces: result.detected_faces || 0,
        matches: result.matches || []
      };

    } catch (error) {
      console.error('Error calling Python backend:', error);
      throw error;
    }
  },

  verifyFace: async (imageBlob: Blob, knownEmbedding: number[]) => {
    const PYTHON_BACKEND = 'https://arefintitly-attendu-server.hf.space';

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
  },

  syncFaces: async () => {
    const PYTHON_BACKEND = 'https://arefintitly-attendu-server.hf.space';
    try {
      await fetch(`${PYTHON_BACKEND}/api/face/sync`, { method: 'POST' });
      console.log('🔄 Triggered backend FAISS sync');
    } catch (e) {
      console.error("Failed to trigger sync:", e);
    }
  }
};
