import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import api from '../../utils/api';
import ReCAPTCHA from 'react-google-recaptcha';
import toast from 'react-hot-toast';

const RECAPTCHA_SITE_KEY = '6LeoGGEtAAAAAIJsVDCAR9V9SxzzLE9Hqc46Fetz';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(null);
  const recaptchaRef = useRef(null);

  // Forgot password states
  const [forgotStep, setForgotStep] = useState(null); // null, 'email', 'otp', 'newpass'
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Unverified email states
  const [verifyStep, setVerifyStep] = useState(null); // null, 'otp'
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyOtp, setVerifyOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [loginAttempts, setLoginAttempts] = useState(() => {
    return parseInt(localStorage.getItem('loginAttempts') || '0');
  });
  const [lockout, setLockout] = useState(() => {
    const lockedUntil = localStorage.getItem('loginLockedUntil');
    if (!lockedUntil) return 0;
    const remaining = Math.floor((parseInt(lockedUntil) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (lockout <= 0) {
      localStorage.removeItem('loginLockedUntil');
      return;
    }
    const timer = setInterval(() => setLockout(l => l - 1), 1000);
    return () => clearInterval(timer);
  }, [lockout]);

  useEffect(() => {
    localStorage.setItem('loginAttempts', loginAttempts.toString());
  }, [loginAttempts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockout > 0) { toast.error(`Too many attempts. Try again in ${Math.floor(lockout / 60)}:${String(lockout % 60).padStart(2, '0')}`); return; }
    if (!captchaValue) { toast.error('Please complete the reCAPTCHA verification.'); return; }
    try {
      const userData = await login(email, password);
      setLoginAttempts(0);
      localStorage.removeItem('loginAttempts');
      navigate(userData.role === 'admin' ? '/admin/dashboard' : '/client/dashboard');
    } catch (err) {
      // Check if unverified email
      if (err.response?.data?.unverified) {
        const userEmail = err.response.data.email;
        setVerifyEmail(userEmail);
        setSendingOtp(true);
        try {
          await api.post('/auth/send-otp.php', { email: userEmail, type: 'verification' });
          toast.success('Verification OTP sent to your email!');
          setCooldown(300);
          setVerifyStep('otp');
        } catch {
          toast.error('Failed to send OTP');
        } finally { setSendingOtp(false); }
      } else {
        const attempts = loginAttempts + 1;
        setLoginAttempts(attempts);
        if (attempts >= 5) {
          const lockSeconds = 180;
          setLockout(lockSeconds);
          localStorage.setItem('loginLockedUntil', (Date.now() + lockSeconds * 1000).toString());
          setLoginAttempts(0);
          toast.error('Too many failed attempts. Account locked for 3 minutes.');
        }
      }
    }
  };

  // Forgot password flow
  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (!resetEmail) { toast.error('Enter your email'); return; }
    setSendingOtp(true);
    try {
      await api.post('/auth/send-otp.php', { email: resetEmail, type: 'reset' });
      toast.success('Reset OTP sent to your email!');
      setForgotStep('otp');
    } catch {
      toast.error('Failed to send OTP. Check your email.');
    } finally { setSendingOtp(false); }
  };

  const handleVerifyResetOtp = async (e) => {
    e.preventDefault();
    if (resetOtp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setVerifying(true);
    try {
      await api.post('/auth/verify-otp.php', { email: resetEmail, otp: resetOtp, type: 'reset' });
      toast.success('OTP verified!');
      setForgotStep('newpass');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally { setVerifying(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('Passwords do not match'); return; }
    try {
      await api.post('/auth/reset-password.php', { email: resetEmail, new_password: newPassword });
      toast.success('Password reset successfully! You can now log in.');
      setForgotStep(null);
      setResetEmail('');
      setResetOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    if (verifyOtp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setVerifying(true);
    try {
      await api.post('/auth/verify-otp.php', { email: verifyEmail, otp: verifyOtp, type: 'verification' });
      toast.success('Email verified! You can now log in.');
      setVerifyStep(null);
      setVerifyOtp('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally { setVerifying(false); }
  };

  const handleResendVerifyOtp = async () => {
    setSendingOtp(true);
    try {
      await api.post('/auth/send-otp.php', { email: verifyEmail, type: 'verification' });
      toast.success('New OTP sent!');
      setCooldown(300);
    } catch {
      toast.error('Failed to resend OTP');
    } finally { setSendingOtp(false); }
  };

  // Verify email OTP screen
  if (verifyStep === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-sm text-gray-500 mt-1">We sent a 6-digit code to <span className="font-medium text-gray-700">{verifyEmail}</span></p>
          </div>
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <input type="text" value={verifyOtp} onChange={e => setVerifyOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} placeholder="000000" className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-center text-2xl font-bold tracking-[0.5em] text-gray-900" />
            <button type="submit" disabled={verifying || verifyOtp.length !== 6} className="w-full bg-primary hover:bg-primary-accent text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {verifying && <span className="btn-spinner"></span>}
              {verifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
          <div className="text-center mt-5">
            <p className="text-sm text-gray-500">Didn't receive the code?</p>
            <button onClick={handleResendVerifyOtp} disabled={sendingOtp || cooldown > 0} className="text-primary font-semibold text-sm hover:underline mt-1 disabled:opacity-50 disabled:no-underline">
              {sendingOtp ? 'Sending...' : cooldown > 0 ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}` : 'Resend OTP'}
            </button>
          </div>
          <button onClick={() => setVerifyStep(null)} className="w-full text-center text-sm text-gray-500 mt-4 hover:text-gray-700">← Back to Login</button>
        </div>
      </div>
    );
  }

  // Forgot password modal
  if (forgotStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-md w-full">
          {forgotStep === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Reset Password</h2>
                <p className="text-sm text-gray-500 mt-1">Enter your email to receive a reset OTP</p>
              </div>
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="you@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm" />
                <button type="submit" disabled={sendingOtp} className="w-full bg-primary hover:bg-primary-accent text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {sendingOtp && <span className="btn-spinner"></span>}
                  {sendingOtp ? 'Sending OTP...' : 'Send Reset OTP'}
                </button>
              </form>
              <button onClick={() => setForgotStep(null)} className="w-full text-center text-sm text-gray-500 mt-4 hover:text-gray-700">← Back to Login</button>
            </>
          )}

          {forgotStep === 'otp' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Enter OTP</h2>
                <p className="text-sm text-gray-500 mt-1">We sent a code to <span className="font-medium text-gray-700">{resetEmail}</span></p>
              </div>
              <form onSubmit={handleVerifyResetOtp} className="space-y-4">
                <input type="text" value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} placeholder="000000" className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-center text-2xl font-bold tracking-[0.5em] text-gray-900" />
                <button type="submit" disabled={verifying || resetOtp.length !== 6} className="w-full bg-primary hover:bg-primary-accent text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {verifying && <span className="btn-spinner"></span>}
                  {verifying ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
              <button onClick={() => setForgotStep('email')} className="w-full text-center text-sm text-gray-500 mt-4 hover:text-gray-700">← Change email</button>
            </>
          )}

          {forgotStep === 'newpass' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">New Password</h2>
                <p className="text-sm text-gray-500 mt-1">Create your new password</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="New password (min. 6 chars)" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm" />
                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required placeholder="Confirm new password" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm" />
                <button type="submit" className="w-full bg-primary hover:bg-primary-accent text-white py-3 rounded-xl font-semibold transition-all">
                  Reset Password
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Left - Image */}
        <div className="hidden lg:block relative">
          <img src="/src/assets/home/h2.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/90 to-primary/70"></div>
          <div className="relative h-full flex flex-col items-center justify-center p-10 text-center">
            <img src="/src/assets/global/forest-lake-logo-white.png" alt="Forest Lake" className="h-28 w-auto mb-6" />
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">Where generations of family memories are treasured and immortalized by the living.</p>
          </div>
        </div>

        {/* Right - Form */}
        <div className="p-8 sm:p-10">
          <div className="lg:hidden mb-6 text-center">
            <img src="/src/assets/global/forest-lake-logo.png" alt="Forest Lake" className="h-12 w-auto mx-auto" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
              </div>
              <button type="button" onClick={() => setForgotStep('email')} className="text-xs text-primary font-medium hover:underline mt-1.5 block ml-auto">Forgot password?</button>
            </div>

            <div className="flex justify-center pt-2">
              <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={setCaptchaValue} onExpired={() => setCaptchaValue(null)} size="normal" />
            </div>

            <button type="submit" disabled={loading || sendingOtp || lockout > 0} className="w-full bg-primary hover:bg-primary-accent text-white py-3 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {(loading || sendingOtp) && <span className="btn-spinner"></span>}
              {lockout > 0 ? `Locked (${Math.floor(lockout / 60)}:${String(lockout % 60).padStart(2, '0')})` : sendingOtp ? 'Sending verification...' : loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Don't have an account? <Link to="/register" className="text-primary font-semibold hover:underline">Sign up</Link>
          </p>
          <Link to="/" className="block text-center text-xs text-gray-400 mt-3 hover:text-gray-600">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
