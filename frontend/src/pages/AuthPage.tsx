import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, signup } = useAuth(); // Removed unused props
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [lastError, setLastError] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [catalogSubjects, setCatalogSubjects] = useState<any[]>([]); // Changed from subjects to catalogSubjects

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Student signup form state
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentFaculty, setStudentFaculty] = useState('');
  const [studentBatch, setStudentBatch] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentConfirmPassword, setStudentConfirmPassword] = useState('');

  // Teacher signup form state
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherFaculty, setTeacherFaculty] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherConfirmPassword, setTeacherConfirmPassword] = useState('');
  const [teacherAssignments, setTeacherAssignments] = useState<{ batchId: string; sectionId: string; subjectId: string }[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState({ batchId: '', sectionId: '', subjectId: '' });

  // Load registration data
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      setLastError(null);
      try {
        console.log('🔄 Attempting to load registration data...');
        // getSubjects removed, using getCourseCatalog not globally but per request or just init empty
        // Actually for now we don't need subjects globally loaded. Teacher loads specific to batch.
        const [f, b, s] = await Promise.all([
          api.getFaculties(),
          api.getBatches(),
          api.getSections(),
        ]);

        console.log('✅ Diagnostic Load success:', {
          faculties: f.length,
          batches: b.length,
          sections: s.length,
        });

        setFaculties(f || []);
        setBatches(b || []);
        setSections(s || []);
      } catch (e: any) {
        console.group('❌ Registration data load failed');
        console.error('Error Object:', e);
        setLastError(e.message || "Network Error");
        console.groupEnd();
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, []);

  // Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(loginEmail, loginPassword);
    if (!result.success) {
      toast({ title: 'Login Failed', description: result.error, variant: 'destructive' });
      setIsLoading(false);
    } else {
      toast({ title: 'Welcome Back!', description: 'Logged in successfully.' });
      navigate('/admin/dashboard');
    }
  };

  // Student Signup Handler
  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Domain Check
    if (!studentEmail.endsWith('@diu.edu.bd')) {
      toast({ title: 'Invalid Email Domain', description: 'Students must use a @diu.edu.bd email address.', variant: 'destructive' });
      return;
    }

    // Password Confirmation Check
    if (studentPassword !== studentConfirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const result = await signup({
      email: studentEmail,
      password: studentPassword,
      name: studentName,
      role: 'student',
      studentId, // Roll Number
      section_id: studentSection
    });
    if (!result.success) {
      toast({ title: 'Signup Failed', description: result.error, variant: 'destructive' });
      setIsLoading(false);
    } else {
      toast({ title: 'Account Created', description: 'Please login to continue.' });
      setActiveTab('login');
      setIsLoading(false);
    }
  };

  // Teacher Signup Handler
  const handleTeacherSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (teacherPassword !== teacherConfirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const result = await signup({
      email: teacherEmail,
      password: teacherPassword,
      name: teacherName,
      role: 'teacher',
      facultyId: teacherFaculty,
      assignments: teacherAssignments // Note: AuthContext needs to handle this or ignore it if broken
    });
    if (!result.success) {
      toast({ title: 'Signup Failed', description: result.error, variant: 'destructive' });
      setIsLoading(false);
    } else {
      toast({ title: 'Account Created', description: 'Please login to continue.' });
      setActiveTab('login');
      setIsLoading(false);
    }
  };

  // Helper filters
  const getBatchesForFaculty = (facultyId: string) => batches.filter(b => b.faculty_id === facultyId);
  const getSectionsForBatch = (batchId: string) => sections.filter(s => s.batch_id === batchId);

  // Load Catalog Subjects when Batch selected for Teacher Assignment
  useEffect(() => {
    if (currentAssignment.batchId) {
      const batch = batches.find(b => b.id === currentAssignment.batchId);
      if (batch) {
        api.getCourseCatalog(batch.faculty_id, batch.current_semester)
          .then(data => setCatalogSubjects(data || []))
          .catch(err => console.error(err));
      }
    } else {
      setCatalogSubjects([]);
    }
  }, [currentAssignment.batchId, batches]);


  const addAssignment = () => {
    if (currentAssignment.batchId && currentAssignment.sectionId && currentAssignment.subjectId) {
      setTeacherAssignments([...teacherAssignments, currentAssignment]);
      setCurrentAssignment({ batchId: '', sectionId: '', subjectId: '' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Attendance System</CardTitle>
          <CardDescription className="text-center">
            Login or create an account to get started
            {lastError && <div className="text-destructive text-xs mt-2">{lastError}</div>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* LOGIN TAB */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</Button>
              </form>
            </TabsContent>

            {/* SIGNUP TAB */}
            <TabsContent value="signup">
              <Tabs defaultValue="student" className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="student">Student</TabsTrigger>
                  <TabsTrigger value="teacher">Teacher</TabsTrigger>
                </TabsList>

                {/* STUDENT SIGNUP */}
                <TabsContent value="student">
                  <form onSubmit={handleStudentSignup} className="space-y-3">
                    <div className="space-y-1"><Label>Full Name</Label><Input value={studentName} onChange={e => setStudentName(e.target.value)} required /></div>
                    <div className="space-y-1"><Label>Student ID (Roll)</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} required placeholder="e.g. 253-35-108" /></div>
                    <div className="space-y-1"><Label>Email</Label><Input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} required /></div>

                    <div className="space-y-1">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={studentPassword} onChange={e => setStudentPassword(e.target.value)} required />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Confirm Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={studentConfirmPassword} onChange={e => setStudentConfirmPassword(e.target.value)} required />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Department</Label>
                      <Select value={studentFaculty} onValueChange={setStudentFaculty}>
                        <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                        <SelectContent>
                          {faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Batch</Label>
                        <Select value={studentBatch} onValueChange={setStudentBatch} disabled={!studentFaculty}>
                          <SelectTrigger><SelectValue placeholder="Batch" /></SelectTrigger>
                          <SelectContent>
                            {getBatchesForFaculty(studentFaculty).map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name} (Sem {b.current_semester})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Section</Label>
                        <Select value={studentSection} onValueChange={setStudentSection} disabled={!studentBatch}>
                          <SelectTrigger><SelectValue placeholder="Sec" /></SelectTrigger>
                          <SelectContent>
                            {getSectionsForBatch(studentBatch).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button type="submit" className="w-full mt-2" disabled={isLoading || isDataLoading}>{isLoading ? 'Creating Account...' : 'Sign Up'}</Button>
                  </form>
                </TabsContent>

                {/* TEACHER SIGNUP */}
                <TabsContent value="teacher">
                  <form onSubmit={handleTeacherSignup} className="space-y-3">
                    <div className="space-y-1"><Label>Full Name</Label><Input value={teacherName} onChange={e => setTeacherName(e.target.value)} required /></div>
                    <div className="space-y-1"><Label>Email</Label><Input type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} required /></div>

                    <div className="space-y-1">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)} required />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Confirm Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={teacherConfirmPassword} onChange={e => setTeacherConfirmPassword(e.target.value)} required />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Department</Label>
                      <Select value={teacherFaculty} onValueChange={setTeacherFaculty}>
                        <SelectTrigger><SelectValue placeholder="Select Dept" /></SelectTrigger>
                        <SelectContent>
                          {faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border p-3 rounded-md space-y-2">
                      <Label className="text-xs font-semibold uppercase text-muted-foreground">Add Class Assignment (Optional)</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={currentAssignment.batchId} onValueChange={v => setCurrentAssignment({ ...currentAssignment, batchId: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
                          <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={currentAssignment.sectionId} onValueChange={v => setCurrentAssignment({ ...currentAssignment, sectionId: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                          <SelectContent>{getSectionsForBatch(currentAssignment.batchId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Select value={currentAssignment.subjectId} onValueChange={v => setCurrentAssignment({ ...currentAssignment, subjectId: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subject (Catalog)" /></SelectTrigger>
                        <SelectContent>
                          {catalogSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" variant="secondary" className="w-full h-7 text-xs" onClick={addAssignment} disabled={!currentAssignment.subjectId}>Add Class</Button>

                      {teacherAssignments.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {teacherAssignments.length} classes added
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full mt-2" disabled={isLoading || isDataLoading}>{isLoading ? 'Creating Account...' : 'Sign Up'}</Button>
                  </form>
                </TabsContent>

              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
