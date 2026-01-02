
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserCircle2 } from 'lucide-react';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { setSelectedRole } = useAuth();
  const [role, setRole] = useState<string>("");

  const handleContinue = () => {
    if (!role) return;

    if (role === 'admin') {
      setSelectedRole('admin');
      navigate('/admin/login');
    } else {
      setSelectedRole(role as 'student' | 'teacher');
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen width-full bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Card className="border-0 shadow-xl bg-card/50 backdrop-blur-sm ring-1 ring-white/10">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
              <UserCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-base">
                Please select your role to continue
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I am a...
              </label>
              <Select onValueChange={(value) => setRole(value)}>
                <SelectTrigger className="h-12 text-base transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student" className="h-10 cursor-pointer">
                    Student
                  </SelectItem>
                  <SelectItem value="teacher" className="h-10 cursor-pointer">
                    Teacher
                  </SelectItem>
                  <SelectItem value="admin" className="h-10 cursor-pointer">
                    Administrator
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full h-11 text-base font-medium shadow-lg hover:shadow-primary/25 transition-all duration-300"
              size="lg"
              onClick={handleContinue}
              disabled={!role}
            >
              Continue
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          University Attendance System v1.0
        </p>
      </div>
    </div>
  );
};

export default RoleSelection;
