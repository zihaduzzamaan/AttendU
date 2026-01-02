import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { setSelectedRole, login, isAuthenticated, role } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(false); // For consistency with diagnostics

  const manualTest = async () => {
    console.log('🧪 Running manual connection test (Admin)...');
    try {
      const result = await supabase.from('faculties').select('*', { count: 'exact', head: true });
      if (result.error) toast({ title: 'DB Connection Failed', description: result.error.message, variant: 'destructive' });
      else toast({ title: 'DB Connection OK', description: 'Database is reachable.' });

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
        toast({ title: 'System Reachable', description: 'Network passed deep tests.' });
      } else {
        const reason = postTest.status === 0 ? "Network Blocked/Timeout" : `Error ${postTest.status}`;
        toast({
          title: 'Connection Issue',
          description: `Direct check failed (${reason}). Your project might be paused or internet restricted.`,
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      console.error('❌ Test failed:', e);
      toast({ title: 'System Error', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    setSelectedRole('admin');
  }, [setSelectedRole]);

  useEffect(() => {
    if (isAuthenticated && role === 'admin') {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('🔑 Admin login attempt:', email);

    try {
      const result = await login(email, password);
      console.log('🔑 result:', result);

      if (result.success) {
        toast({
          title: 'Admin login successful',
          description: 'Welcome, Administrator!',
        });
      } else {
        toast({
          title: 'Login failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('❌ Admin login exception:', error);
      toast({
        title: 'Unexpected error',
        description: error.message || 'Check console for details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Debug Info */}
      <div className="mb-4 p-2 text-[10px] font-mono bg-muted rounded border max-w-sm w-full relative">
        <button
          onClick={manualTest}
          className="absolute right-2 top-2 px-2 py-1 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 text-[8px] uppercase font-bold"
        >
          Check API
        </button>
        <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL?.split('//')[1]?.split('.')[0] || 'MISSING'}.supabase.co</p>
        <p>Key Format: {import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ') ? '✅ Valid' : '❌ INVALID'}</p>
        <p>Network: {window.location.hostname === 'localhost' ? '✅ Localhost' : '⚠️ Non-localhost'}</p>
        <p>Status: {isAuthenticated ? 'Authenticated' : 'Not Logged In'}</p>
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <Card className="border-2 border-destructive/20">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-foreground/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-foreground" />
            </div>
            <CardTitle className="text-2xl">Admin Portal</CardTitle>
            <CardDescription>
              Authorized personnel only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              <Button type="submit" className="w-full bg-foreground hover:bg-foreground/90 text-background" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In as Admin'}
              </Button>
            </form>

            <div className="mt-6 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground text-center">
                <strong>Demo credentials:</strong><br />
                Email: admin@university.edu<br />
                Password: admin123
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
