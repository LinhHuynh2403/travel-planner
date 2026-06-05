import { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../utils/supabaseClient';
import { Button } from '../components/ui/button';
import { Mail, Lock, Sparkles, Chrome, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        
        // If email confirmation is required, Supabase returns user but session is null/unconfirmed
        if (data.user && !data.session) {
          setSuccessMsg('Registration successful! Please check your email for the confirmation link.');
        } else if (data.session) {
          localStorage.setItem('userId', data.user?.id || '');
          navigate('/');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          localStorage.setItem('userId', data.user.id);
          navigate('/');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Google Login.');
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setLoading(true);
    localStorage.setItem('isDemoMode', 'true');
    localStorage.setItem('userId', 'demo-user-12345');
    navigate('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/80 border border-zinc-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="size-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-4">
            <Sparkles className="size-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">JourZy</h1>
          <p className="text-zinc-400 text-sm mt-2">
            {isSignUp ? 'Create your travel profile' : 'Sign in to unlock personalized planning'}
          </p>
        </div>

        {/* Message banners */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/30 border border-red-800/40 text-red-400 text-sm flex items-start gap-2.5">
            <AlertCircle className="size-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 text-sm flex items-start gap-2.5 animate-pulse">
            <Sparkles className="size-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Auth form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
              />
              <Mail className="size-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-3.5 pl-11 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
              />
              <Lock className="size-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl py-6 font-semibold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 transition-all mt-6"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                {isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-[1px] bg-zinc-800 flex-1" />
          <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Or continue with</span>
          <div className="h-[1px] bg-zinc-800 flex-1" />
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-zinc-950 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-white rounded-2xl py-6 font-semibold flex items-center justify-center gap-3 transition-all mb-3"
        >
          <Chrome className="size-4 text-emerald-400" />
          Continue with Google
        </Button>

        {/* Demo Bypass Button */}
        <Button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full bg-emerald-600/10 border border-emerald-500/20 hover:bg-emerald-600/20 text-emerald-400 rounded-2xl py-6 font-semibold flex items-center justify-center gap-3 transition-all"
        >
          <Sparkles className="size-4" />
          Test with Demo Account (Bypass)
        </Button>

        {/* Toggle Sign In / Sign Up */}
        <div className="text-center mt-8 text-sm text-zinc-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 transition-colors"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
