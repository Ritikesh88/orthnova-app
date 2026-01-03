import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LOGO_URL = '/orthonova-logo.png';

const LoginForm: React.FC = () => {
  const { login, loading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Redirect based on user role after successful login
  useEffect(() => {
    if (user) {
      // Check for redirect parameter in the URL
      const searchParams = new URLSearchParams(location.search);
      const redirectPath = searchParams.get('redirect');
      
      if (redirectPath) {
        // If there's a redirect parameter, use it
        navigate(redirectPath);
      } else {
        // Otherwise, redirect based on user role
        if (user.role === 'admin') {
          navigate('/clinic/admin/dashboard');
        } else if (user.role === 'receptionist') {
          navigate('/clinic/receptionist/dashboard');
        } else if (user.role === 'doctor') {
          navigate('/clinic/patients');
        } else {
          // For any other role, go to home
          navigate('/');
        }
      }
    }
  }, [user, navigate, location]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await login(userId.trim(), password);
    if (!res.ok) setError(res.error);
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="flex items-center justify-center p-6 bg-gradient-to-br from-brand-50 via-white to-brand-50">
        <div className="card w-full max-w-md p-8 shadow-xl">
          <div className="text-center">
            <img src={LOGO_URL} alt="ORTHONOVA POLYCLINIC Logo" className="mx-auto w-full h-auto max-w-[320px] mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">ORTHONOVA POLYCLINIC</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">User ID</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
                </span>
                <input
                  type="text"
                  className="pl-9 w-full"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type="password"
                  className="pl-9 w-full"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
      <div className="hidden md:block relative">
        <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=1600&auto=format&fit=crop" alt="Clinic" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-brand-500/20" />
      </div>
    </div>
  );
};

export default LoginForm;