import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import RoleSelection from "./pages/RoleSelection";
import AuthPage from "./pages/AuthPage";
import AdminLogin from "./pages/AdminLogin";
import FaceRegistration from "./pages/FaceRegistration";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import AcademicStructure from "./pages/admin/AcademicStructure";
import UserManagement from "./pages/admin/UserManagement";
import RoutineManagement from "./pages/admin/RoutineManagement";
import AttendanceManagement from "./pages/admin/AttendanceManagement";
import Settings from "./pages/admin/Settings";
import TeacherLayout from "./layouts/TeacherLayout";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import Classes from "./pages/teacher/Classes";
import Routine from "./pages/teacher/Routine";
import TakeAttendance from "./pages/teacher/TakeAttendance";
import PastAttendance from "./pages/teacher/PastAttendance";
import { Navigate } from "react-router-dom";

import StudentLayout from "./layouts/StudentLayout";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentProfile from "./pages/student/StudentProfile";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RoleSelection />} />
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
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
