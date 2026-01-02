import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

const AuthPage = () => {
  const navigate = useNavigate();
  const { selectedRole, setSelectedRole, login, signup, isAuthenticated, role } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Used for form submissions
  const [isDataLoading, setIsDataLoading] = useState(false); // Used for background data fetch

  // Registration Data
  const [faculties, setFaculties] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

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

  // Teacher signup form state
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherFaculty, setTeacherFaculty] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherAssignments, setTeacherAssignments] = useState<{ batchId: string; sectionId: string; subjectId: string }[]>([]);
  const [currentAssignment, setCurrentAssignment] = useState({ batchId: '', sectionId: '', subjectId: '' });

  // Load registration data
  useEffect(() => {
    const loadData = async () => {
      setIsDataLoading(true);
      try {
        console.log('🔄 Attempting to load registration data...');
        const [f, b, s, sub] = await Promise.all([
          api.getFaculties(),
          api.getBatches(),
          api.getSections(),
          api.getSubjects()
        ]);

        console.log('✅ Diagnostic Load success:', {
          faculties: f.length,
          batches: b.length,
          sections: s.length,
          url: import.meta.env.VITE_SUPABASE_URL
        });

        setFaculties(f);
        setBatches(b);
        setSections(s);
        setSubjects(sub);
      } catch (e: any) {
        console.group('❌ Registration data load failed');
        console.error('Error Object:', e);
        console.error('Message:', e.message);
        console.error('Details:', e.details);
        console.error('Hint:', e.hint);
        console.groupEnd();

        toast({
          title: 'Error loading data',
          description: e.message || 'Check browser console for details.',
          variant: 'destructive'
        });
      } finally {
        setIsDataLoading(false);
      }
    };
    loadData();
  }, []);

  const manualTest = async () => {
    console.log('🧪 Running manual connection test...');
    const result = await supabase.from('faculties').select('*');
    console.log('🧪 Raw Result:', result);
    if (result.error) toast({ title: 'Test Failed', description: result.error.message, variant: 'destructive' });
    else toast({ title: 'Test Success', description: `Found ${result.data?.length} faculties` });

    // Test Auth endpoint connectivity
    console.log('🧪 Testing Auth Connection...');
    try {
      const authUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/health`;
      console.log('🔗 1. Pinging Health:', authUrl);
      const ping: any = await Promise.race([
        fetch(authUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Health ping timeout')), 5000))
      ]).catch(err => ({ ok: false, status: 0, statusText: err.message }));

      console.log('🔗 Health Result:', ping.status, ping.ok ? 'OK' : 'FAIL', ping.statusText || '');

      const tokenUrl = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/token?grant_type=password`;
      console.log('🔗 2. Testing POST (Direct Token API):', tokenUrl);
      const postTest: any = await Promise.race([
        fetch(tokenUrl, {
          method: 'POST',
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@ping.com', password: 'ping' })
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('POST test timeout')), 5000))
      ]).catch(err => ({ ok: false, status: 0, statusText: err.message }));

      console.log('🔗 POST Result:', postTest.status, postTest.statusText || '');

      const { data, error: authErr } = await supabase.auth.getSession().catch(err => ({ data: null, error: err }));
      console.log('🔗 Client Session Check:', authErr ? 'ERROR' : 'OK', authErr?.message || '');

      if (ping.ok || postTest.status === 400 || postTest.status === 401) {
        toast({ title: 'Network OK', description: 'Supabase Auth is reachable.' });
      } else {
        const reason = postTest.status === 0 ? "Network Blocked/Timeout" : `Error ${postTest.status}`;
        toast({
          title: 'Connection Issue',
          description: `Direct check failed (${reason}). Your project might be paused or internet restricted.`,
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      console.error('❌ Deep Test Failed:', e);
      toast({ title: 'System Error', description: e.message, variant: 'destructive' });
    }

    // Also try to reload the full data
    const [f, b, s, sub] = await Promise.all([
      api.getFaculties().catch(() => []),
      api.getBatches().catch(() => []),
      api.getSections().catch(() => []),
      api.getSubjects().catch(() => [])
    ]);
    setFaculties(f); setBatches(b); setSections(s); setSubjects(sub);
  };

  // Redirect if no role selected
  useEffect(() => {
    if (!selectedRole) {
      navigate('/');
    }
  }, [selectedRole, navigate]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (role === 'student') navigate('/student/attendance');
      else if (role === 'teacher') navigate('/teacher');
      else if (role === 'admin') navigate('/admin/dashboard');
    }
  }, [isAuthenticated, role, navigate]);

  const handleBack = () => {
    setSelectedRole(null);
    navigate('/');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('🔑 Attempting login for:', loginEmail);

    try {
      const result = await login(loginEmail, loginPassword);
      console.log('🔑 Login result:', result);

      if (result.success) {
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
      } else {
        toast({
          title: 'Login failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('🔑 Login exception:', error);
      toast({
        title: 'Login error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('📝 Attempting student signup for:', studentEmail);

    try {
      const result = await signup({
        role: 'student',
        name: studentName,
        studentId: studentId,
        email: studentEmail,
        batchId: studentBatch,
        section_id: studentSection, // Match DB column name or handle in AuthContext
        password: studentPassword,
      });
      console.log('📝 Signup result:', result);

      if (result.success) {
        toast({
          title: 'Account created',
          description: 'Please complete face registration to activate your account.',
        });
        navigate('/face-registration');
      } else {
        toast({
          title: 'Signup failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('📝 Signup exception:', error);
      toast({
        title: 'Signup error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (teacherAssignments.length === 0) {
      toast({
        title: 'No assignments',
        description: 'Please add at least one teaching assignment.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    const result = await signup({
      role: 'teacher',
      name: teacherName,
      email: teacherEmail,
      facultyId: teacherFaculty,
      password: teacherPassword,
      assignments: teacherAssignments.map(a => ({ subjectId: a.subjectId })),
    });

    if (result.success) {
      toast({
        title: 'Account created',
        description: 'Welcome to the system!',
      });
      navigate('/teacher');
    } else {
      toast({
        title: 'Signup failed',
        description: result.error,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  const addAssignment = () => {
    if (currentAssignment.batchId && currentAssignment.sectionId && currentAssignment.subjectId) {
      // Check for duplicates
      const exists = teacherAssignments.some(
        a => a.batchId === currentAssignment.batchId &&
          a.sectionId === currentAssignment.sectionId &&
          a.subjectId === currentAssignment.subjectId
      );

      if (exists) {
        toast({
          title: 'Duplicate assignment',
          description: 'This assignment already exists.',
          variant: 'destructive',
        });
        return;
      }

      setTeacherAssignments([...teacherAssignments, currentAssignment]);
      setCurrentAssignment({ batchId: '', sectionId: '', subjectId: '' });
    } else {
      toast({
        title: 'Incomplete assignment',
        description: 'Please select batch, section, and subject.',
        variant: 'destructive',
      });
    }
  };

  const removeAssignment = (index: number) => {
    setTeacherAssignments(teacherAssignments.filter((_, i) => i !== index));
  };

  const studentSections = sections.filter(s => s.batch_id === studentBatch);
  const assignmentSections = sections.filter(s => s.batch_id === currentAssignment.batchId);
  const assignmentSubjects = subjects.filter(sub => sub.section_id === currentAssignment.sectionId);

  const getAssignmentLabel = (assignment: { batchId: string; sectionId: string; subjectId: string }) => {
    const batch = batches.find(b => b.id === assignment.batchId);
    const section = sections.find(s => s.id === assignment.sectionId);
    const subject = subjects.find(s => s.id === assignment.subjectId);
    return `${batch?.name} - ${section?.name} - ${subject?.name}`;
  };

  if (!selectedRole) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Debug Info (Only visible if you know where to look, or for now, just visible for troubleshooting) */}
      <div className="mb-4 p-2 text-[10px] font-mono bg-muted rounded border max-w-md w-full relative">
        <button
          onClick={manualTest}
          className="absolute right-2 top-2 px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-[8px] uppercase font-bold"
        >
          Test Connection
        </button>
        <p>Project URL: {import.meta.env.VITE_SUPABASE_URL?.includes('placeholder') ? '⚠️ USING PLACEHOLDER' : (import.meta.env.VITE_SUPABASE_URL || '❌ MISSING')}</p>
        <p>Key Format: {import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? '✅ Valid (JWT)' : '❌ INVALID'}</p>
        <p>Network context: {window.location.hostname === 'localhost' ? '✅ Localhost' : '⚠️ Non-localhost (May block Auth)'}</p>
        <p>Connection: {faculties.length > 0 || batches.length > 0 ? '✅ Connected' : '⚠️ Warning (Check DB)'}</p>
        <p>Stats: {faculties.length} F, {batches.length} B, {sections.length} S</p>
        {!isDataLoading && faculties.length === 0 && (
          <div className="mt-1 text-destructive font-bold uppercase space-y-1">
            <p>1. Check browser console (F12) for error details.</p>
            <p>2. Ensure .env has correct keys & restart server.</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-md animate-fade-in text-foreground">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Role Selection
        </Button>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl capitalize">{selectedRole} Portal</CardTitle>
            <CardDescription>
              {activeTab === 'login' ? 'Sign in to your account' : 'Create a new account'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">University Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@university.edu"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {selectedRole === 'student' ? (
                  <form onSubmit={handleStudentSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentId">Student ID</Label>
                      <Input
                        id="studentId"
                        placeholder="STU2024001"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail">University Email</Label>
                      <Input
                        id="signupEmail"
                        type="email"
                        placeholder="you@university.edu"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Faculty / Department</Label>
                      <Select value={studentFaculty} onValueChange={(v) => { setStudentFaculty(v); setStudentBatch(''); setStudentSection(''); }} required>
                        <SelectTrigger>
                          <SelectValue placeholder={isDataLoading ? "Loading..." : "Select faculty"} />
                        </SelectTrigger>
                        <SelectContent>
                          {faculties.length > 0 ? (
                            faculties.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No faculties found in database
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Batch</Label>
                        <Select
                          value={studentBatch}
                          onValueChange={(v) => { setStudentBatch(v); setStudentSection(''); }}
                          disabled={!studentFaculty}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isDataLoading ? "Loading..." : "Select batch"} />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.filter(b => b.faculty_id === studentFaculty).map(batch => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Section</Label>
                        <Select
                          value={studentSection}
                          onValueChange={setStudentSection}
                          disabled={!studentBatch}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={isDataLoading ? "Loading..." : "Select section"} />
                          </SelectTrigger>
                          <SelectContent>
                            {studentSections.map(section => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword">Password</Label>
                      <div className="relative">
                        <Input
                          id="signupPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          value={studentPassword}
                          onChange={(e) => setStudentPassword(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      After signup, you'll need to complete face registration to activate your account.
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleTeacherSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teacherName">Full Name</Label>
                      <Input
                        id="teacherName"
                        placeholder="Dr. Robert Miller"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacherEmail">University Email</Label>
                      <Input
                        id="teacherEmail"
                        type="email"
                        placeholder="you@university.edu"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Faculty / Department</Label>
                      <Select value={teacherFaculty} onValueChange={setTeacherFaculty} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select faculty" />
                        </SelectTrigger>
                        <SelectContent>
                          {faculties.length > 0 ? (
                            faculties.map(f => (
                              <SelectItem key={f.id} value={f.id}>
                                {f.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No faculties found in database
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacherPassword">Password</Label>
                      <div className="relative">
                        <Input
                          id="teacherPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a password"
                          value={teacherPassword}
                          onChange={(e) => setTeacherPassword(e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Teaching Assignments */}
                    <div className="space-y-3 pt-2 border-t">
                      <Label>Teaching Assignments</Label>
                      <p className="text-xs text-muted-foreground">
                        Add the batch, section, and subject combinations you will teach.
                      </p>

                      {teacherAssignments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {teacherAssignments.map((assignment, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="flex items-center gap-1 py-1"
                            >
                              {getAssignmentLabel(assignment)}
                              <button
                                type="button"
                                onClick={() => removeAssignment(index)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        <Select
                          value={currentAssignment.batchId}
                          onValueChange={(v) => setCurrentAssignment({ ...currentAssignment, batchId: v, sectionId: '', subjectId: '' })}
                        >
                          <SelectTrigger className="text-[10px] px-1 h-8">
                            <SelectValue placeholder="Batch" />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.map(batch => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={currentAssignment.sectionId}
                          onValueChange={(v) => setCurrentAssignment({ ...currentAssignment, sectionId: v, subjectId: '' })}
                          disabled={!currentAssignment.batchId}
                        >
                          <SelectTrigger className="text-[10px] px-1 h-8">
                            <SelectValue placeholder="Sect" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignmentSections.map(section => (
                              <SelectItem key={section.id} value={section.id}>
                                {section.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={currentAssignment.subjectId}
                          onValueChange={(v) => setCurrentAssignment({ ...currentAssignment, subjectId: v })}
                          disabled={!currentAssignment.sectionId}
                        >
                          <SelectTrigger className="text-[10px] px-1 h-8">
                            <SelectValue placeholder="Subj" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignmentSubjects.map(subject => (
                              <SelectItem key={subject.id} value={subject.id}>
                                {subject.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={addAssignment}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Assignment
                      </Button>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
