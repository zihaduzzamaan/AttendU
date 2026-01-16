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
import { Footer } from '@/components/ui/Footer';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { setSelectedRole, login, isAuthenticated, role } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    try {
      const result = await login(email, password);
      if (result.success) {
        toast({ title: 'Admin login successful', description: 'Welcome, Administrator!' });
      } else {
        toast({ title: 'Login failed', description: result.error, variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Unexpected error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 100, 100, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 100, 100, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-md animate-fade-in">
        <Button
          variant="ghost"
          className="self-start mb-6 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="w-full border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-white/5">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-bold tracking-tight text-white">Login as Admin</CardTitle>
            <CardDescription className="text-gray-400">
              Authorized personnel only
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Admin Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:ring-indigo-500/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 border-white/10 bg-white/5 text-white placeholder:text-gray-500 focus:border-indigo-500/50 focus:ring-indigo-500/50"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:bg-transparent hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-500/20 transition-all font-semibold mt-2" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Login as Admin'}
              </Button>
            </form>


          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default AdminLogin;
