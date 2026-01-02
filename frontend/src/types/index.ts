export type UserRole = 'student' | 'teacher' | 'admin';

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Batch {
  id: string;
  name: string;
  year: number;
}

export interface Section {
  id: string;
  name: string;
  batchId: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  departmentId: string;
}

export interface TeachingAssignment {
  id: string;
  batchId: string;
  sectionId: string;
  subjectId: string;
}

export interface Student {
  id: string;
  name: string;
  studentId: string; // University Roll
  student_id?: string; // DB UUID in students table
  email: string;
  batchId?: string;
  sectionId?: string;
  section_id?: string; // DB UUID
  password?: string;
  faceRegistered?: boolean;
  face_registered?: boolean;
  faceEmbedding?: number[];
  face_embedding?: number[];
  isActive?: boolean;
  is_active?: boolean;
  createdAt: string;
  teacher_id?: never; // For union type safety
}

export interface Teacher {
  id: string;
  name: string;
  teacherId?: string;
  teacher_id?: string; // DB UUID in teachers table
  email: string;
  departmentId?: string;
  faculty_id?: string;
  employee_id?: string;
  password?: string;
  assignments?: TeachingAssignment[];
  isActive?: boolean;
  is_active?: boolean;
  createdAt: string;
  student_id?: never; // For union type safety
}

export interface Admin {
  id: string;
  email: string;
  name: string;
  password?: string;
  student_id?: never;
  teacher_id?: never;
}

export interface Routine {
  id: string;
  batchId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  days: string[];
  startTime: string;
  endTime: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  routineId: string;
  date: string;
  status: 'present' | 'absent';
  markedBy: string;
  markedAt: string;
}

export interface AuthState {
  user: Student | Teacher | Admin | null;
  role: UserRole | null;
  isAuthenticated: boolean;
}
