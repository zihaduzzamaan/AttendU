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
import { Eye, EyeOff } from 'lucide-react';
import { Footer } from '@/components/ui/Footer';

const AuthPage = () => {
  const navigate = useNavigate();
  const { login, signup, selectedRole, user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [lastError, setLastError] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [catalogSubjects, setCatalogSubjects] = useState<any[]>([]);

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
        const [f, b, s] = await Promise.all([
          api.getFaculties(),
          api.getBatches(),
          api.getSections(),
        ]);
        setFaculties(f || []);
        setBatches(b || []);
        setSections(s || []);
      } catch (e: any) {
        setLastError(e.message || "Network Error");
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
      // Use selectedRole to navigate correctly
      if (selectedRole === 'student') navigate('/student/attendance');
      else if (selectedRole === 'teacher') navigate('/teacher/dashboard');
      else navigate('/admin/dashboard');
    }
  };

  // Student Signup Handler
  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmail.endsWith('@diu.edu.bd')) {
      toast({ title: 'Invalid Email Domain', description: 'Students must use a @diu.edu.bd email address.', variant: 'destructive' });
      return;
    }
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
      studentId,
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
      assignments: teacherAssignments
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

  const getBatchesForFaculty = (facultyId: string) => batches.filter(b => b.faculty_id === facultyId);
  const getSectionsForBatch = (batchId: string) => sections.filter(s => s.batch_id === batchId);

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 overflow-y-auto">
      <div className="w-full max-w-md my-8 animate-fade-in">
        <Card className="w-full border-0 shadow-2xl overflow-hidden rounded-3xl bg-card/50 backdrop-blur-xl ring-1 ring-white/10">
          <CardHeader className="text-center pb-4 pt-8 bg-gradient-to-b from-primary/10 to-transparent">
            <CardTitle className="text-3xl font-bold tracking-tight capitalize py-1">
              {activeTab === 'login' ? `Login as ${selectedRole}` : `Sign up as ${selectedRole}`}
            </CardTitle>
            <CardDescription className="text-base font-medium">
              Access your <span className="font-bold text-primary capitalize">{selectedRole}</span> portal
              {lastError && <div className="text-destructive text-sm mt-3 font-semibold bg-destructive/10 p-3 rounded-lg border border-destructive/20">{lastError}</div>}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl mb-8 border border-border/50">
                <TabsTrigger
                  value="login"
                  className="text-sm font-semibold pt-[0.6rem] pb-[0.5rem] rounded-[0.5rem] transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="text-sm font-semibold pt-[0.6rem] pb-[0.5rem] rounded-[0.5rem] transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required className="h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} required className="h-11" />
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 shadow-lg hover:shadow-primary/25 transition-all font-semibold capitalize mt-2 text-base" disabled={isLoading}>
                    {isLoading ? 'Processing...' : `Login as ${selectedRole}`}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {/* Conditionally render based on role to avoid confusion */}
                {selectedRole === 'student' ? (
                  <form onSubmit={handleStudentSignup} className="space-y-3">
                    <div className="space-y-1"><Label>Full Name</Label><Input value={studentName} onChange={e => setStudentName(e.target.value)} required className="h-10" /></div>
                    <div className="space-y-1"><Label>Student ID (Roll)</Label><Input value={studentId} onChange={e => setStudentId(e.target.value)} required placeholder="e.g. 253-35-108" className="h-10" /></div>
                    <div className="space-y-1"><Label>Email</Label><Input type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)} required className="h-10" /></div>

                    <div className="space-y-1">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={studentPassword} onChange={e => setStudentPassword(e.target.value)} required className="h-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Confirm Password</Label>
                      <Input type={showPassword ? "text" : "password"} value={studentConfirmPassword} onChange={e => setStudentConfirmPassword(e.target.value)} required className="h-10" />
                    </div>

                    <div className="space-y-1">
                      <Label>Department</Label>
                      <Select value={studentFaculty} onValueChange={setStudentFaculty}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select Dept" /></SelectTrigger>
                        <SelectContent>
                          {faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Batch</Label>
                        <Select value={studentBatch} onValueChange={setStudentBatch} disabled={!studentFaculty}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Batch" /></SelectTrigger>
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
                          <SelectTrigger className="h-10"><SelectValue placeholder="Sec" /></SelectTrigger>
                          <SelectContent>
                            {getSectionsForBatch(studentBatch).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button type="submit" className="w-full mt-4 h-11 shadow-lg hover:shadow-primary/25 transition-all font-semibold capitalize text-base" disabled={isLoading || isDataLoading}>
                      {isLoading ? 'Creating Account...' : `Sign Up as Student`}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleTeacherSignup} className="space-y-3">
                    <div className="space-y-1"><Label>Full Name</Label><Input value={teacherName} onChange={e => setTeacherName(e.target.value)} required className="h-10" /></div>
                    <div className="space-y-1"><Label>Email</Label><Input type="email" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} required className="h-10" /></div>

                    <div className="space-y-1">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={teacherPassword} onChange={e => setTeacherPassword(e.target.value)} required className="h-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Confirm Password</Label>
                      <Input type={showPassword ? "text" : "password"} value={teacherConfirmPassword} onChange={e => setTeacherConfirmPassword(e.target.value)} required className="h-10" />
                    </div>

                    <div className="space-y-1">
                      <Label>Department</Label>
                      <Select value={teacherFaculty} onValueChange={setTeacherFaculty}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Select Dept" /></SelectTrigger>
                        <SelectContent>
                          {faculties.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="border p-4 rounded-xl space-y-3 bg-muted/30 border-dashed border-primary/20">
                      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-widest text-center block">Access Assignments</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={currentAssignment.batchId} onValueChange={v => setCurrentAssignment({ ...currentAssignment, batchId: v })}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
                          <SelectContent>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={currentAssignment.sectionId} onValueChange={v => setCurrentAssignment({ ...currentAssignment, sectionId: v })}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
                          <SelectContent>{getSectionsForBatch(currentAssignment.batchId).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Select value={currentAssignment.subjectId} onValueChange={v => setCurrentAssignment({ ...currentAssignment, subjectId: v })}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
                        <SelectContent>
                          {catalogSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" variant="secondary" className="w-full h-8 text-xs font-bold" onClick={addAssignment} disabled={!currentAssignment.subjectId}>Add to Schedule</Button>

                      {teacherAssignments.length > 0 && (
                        <div className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1 text-center bg-primary/10 py-1 rounded">
                          {teacherAssignments.length} Assignments Added
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full mt-4 h-11 shadow-lg hover:shadow-primary/25 transition-all font-semibold capitalize text-base" disabled={isLoading || isDataLoading}>
                      {isLoading ? 'Creating Account...' : `Sign Up as Teacher`}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AuthPage;
