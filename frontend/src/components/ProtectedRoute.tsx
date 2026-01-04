
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    allowedRole?: 'admin' | 'student' | 'teacher';
}

const ProtectedRoute = ({ allowedRole }: ProtectedRouteProps) => {
    const { isAuthenticated, role, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (allowedRole && role !== allowedRole) {
        // If user is logged in but tries to access a route for another role
        // Redirect them to their appropriate dashboard
        if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
        if (role === 'student') return <Navigate to="/student/attendance" replace />;
        if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
        return <Navigate to="/" replace />;
    }

    // Phase 13: Mandatory Face Registration for Students
    if (role === 'student' && !(user as any)?.face_registered && window.location.pathname !== '/face-registration') {
        return <Navigate to="/face-registration" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
