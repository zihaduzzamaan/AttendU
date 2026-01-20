import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/providers/AppProvider";
import Home from "@/pages/Home";
import RoleSelection from "@/pages/RoleSelection";
import AuthPage from "@/pages/AuthPage";
import AdminLogin from "@/pages/AdminLogin";
import FaceRegistration from "@/pages/FaceRegistration";
import NotFound from "@/pages/NotFound";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminLayout from "@/layouts/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import AcademicStructure from "@/pages/admin/AcademicStructure";
import UserManagement from "@/pages/admin/UserManagement";
import RoutineManagement from "@/pages/admin/RoutineManagement";
import AttendanceManagement from "@/pages/admin/AttendanceManagement";
import Settings from "@/pages/admin/Settings";
import TeacherLayout from "@/layouts/TeacherLayout";
import TeacherDashboard from "@/pages/teacher/TeacherDashboard";
import Classes from "@/pages/teacher/Classes";
import Routine from "@/pages/teacher/Routine";
import TakeAttendance from "@/pages/teacher/TakeAttendance";
import PastAttendance from "@/pages/teacher/PastAttendance";
import StudentLayout from "@/layouts/StudentLayout";
import StudentAttendance from "@/pages/student/StudentAttendance";
import StudentProfile from "@/pages/student/StudentProfile";
import StudentRoutine from "@/pages/student/StudentRoutine";

const App = () => (
  <AppProvider>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/face-registration" element={<FaceRegistration />} />

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute allowedRole="admin" />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="academic" element={<AcademicStructure />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="routines" element={<RoutineManagement />} />
            <Route path="attendance" element={<AttendanceManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>

        {/* Protected Teacher Routes */}
        <Route element={<ProtectedRoute allowedRole="teacher" />}>
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="classes" element={<Classes />} />
            <Route path="routine" element={<Routine />} />
            <Route path="take-attendance" element={<TakeAttendance />} />
            <Route path="past-attendance" element={<PastAttendance />} />
          </Route>
        </Route>

        {/* Protected Student Routes */}
        <Route element={<ProtectedRoute allowedRole="student" />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="/student/attendance" replace />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="routine" element={<StudentRoutine />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  </AppProvider>
);

export default App;
