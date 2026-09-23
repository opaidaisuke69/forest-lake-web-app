import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import api from '../../utils/api';
import toast from 'react-hot-toast';
import ReCAPTCHA from 'react-google-recaptcha';

const RECAPTCHA_SITE_KEY = '6LeoGGEtAAAAAIJsVDCAR9V9SxzzLE9Hqc46Fetz';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const [form, setForm] = useState({
    first_name: '', middle_name: '', last_name: '',
    contact_number: '', email: '', address: '',
    password: '', confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState('form'); // form, otp, success
  const [captchaValue, setCaptchaValue] = useState(null);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captchaValue) { toast.error('Please complete the reCAPTCHA verification.'); return; }
    if (form.password !== form.confirm_password) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setSendingOtp(true);
    try {
      // Register the account first (unverified)
      await register(form);

      // Generate and send OTP (server-side)
      await api.post('/auth/send-otp.php', { email: form.email, type: 'verification' });

      toast.success('OTP sent to your email!');
      setCooldown(300);
      setStep('otp');
    } catch (err) {
      // Registration might fail if email exists
    } finally { setSendingOtp(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error('Enter the 6-digit OTP'); return; }
    setVerifying(true);
    try {
      await api.post('/auth/verify-otp.php', { email: form.email, otp, type: 'verification' });
      toast.success('Email verified successfully!');
      setStep('success');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
    } finally { setVerifying(false); }
  };

  const handleResendOtp = async () => {
    setSendingOtp(true);
    try {
      await api.post('/auth/send-otp.php', { email: form.email, type: 'verification' });
      toast.success('New OTP sent!');
      setCooldown(300);
    } catch {
      toast.error('Failed to resend OTP');
    } finally { setSendingOtp(false); }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 max-w-md text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Verified!</h2>
          <p className="text-gray-600 text-sm mb-6">Your email has been verified. You can now log in to your account.</p>
          <Link to="/login" className="inline-block bg-primary hover:bg-primary-accent text-white px-6 py-3 rounded-xl font-semibold transition-all">Go to Login</Link>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-gray-500 text-sm mt-2">We sent a 6-digit code to <span className="font-medium text-gray-700">{form.email}</span></p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Enter OTP</label>
              <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} placeholder="000000" className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-center text-2xl font-bold tracking-[0.5em] text-gray-900" />
            </div>
            <button type="submit" disabled={verifying || otp.length !== 6} className="w-full bg-primary hover:bg-primary-accent text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {verifying && <span className="btn-spinner"></span>}
              {verifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="text-center mt-5">
            <p className="text-sm text-gray-500">Didn't receive the code?</p>
            <button onClick={handleResendOtp} disabled={sendingOtp || cooldown > 0} className="text-primary font-semibold text-sm hover:underline mt-1 disabled:opacity-50 disabled:no-underline">
              {sendingOtp ? 'Sending...' : cooldown > 0 ? `Resend in ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, '0')}` : 'Resend OTP'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-5 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Left - Image */}
        <div className="hidden lg:block lg:col-span-2 relative">
          <img src="/src/assets/home/h5.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary-dark/90 to-primary/70"></div>
          <div className="relative h-full flex flex-col items-center justify-center p-10 text-center">
            <img src="/src/assets/global/forest-lake-logo-white.png" alt="Forest Lake" className="h-24 w-auto mb-6" />
            <h2 className="text-xl font-bold text-white mb-3">Join Our Community</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">Create your account to reserve burial lots and manage your records online.</p>
            <div className="space-y-2 text-left w-full max-w-xs">
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Free registration
              </div>
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                OTP email verification
              </div>
              <div className="flex items-center gap-2 text-white/70 text-xs">
                <svg className="w-4 h-4 text-green-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Access all services online
              </div>
            </div>
          </div>
        </div>

        {/* Right - Form */}
        <div className="lg:col-span-3 p-8 sm:p-10">
          <div className="lg:hidden mb-5 text-center">
            <img src="/src/assets/global/forest-lake-logo.png" alt="Forest Lake" className="h-12 w-auto mx-auto" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h1>
          <p className="text-gray-400 text-sm mb-6">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">First Name <span className="text-red-400">*</span></label>
                <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required placeholder="Juan" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Middle Name</label>
                <input type="text" name="middle_name" value={form.middle_name} onChange={handleChange} placeholder="Santos" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Last Name <span className="text-red-400">*</span></label>
                <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required placeholder="Dela Cruz" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contact Number <span className="text-red-400">*</span></label>
                <input type="tel" name="contact_number" value={form.contact_number} onChange={handleChange} required placeholder="09XX XXX XXXX" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email <span className="text-red-400">*</span></label>
                <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address <span className="text-red-400">*</span></label>
              <input type="text" name="address" value={form.address} onChange={handleChange} required placeholder="Complete address" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password <span className="text-red-400">*</span></label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange} required placeholder="Min. 6 characters" className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password <span className="text-red-400">*</span></label>
                <input type="password" name="confirm_password" value={form.confirm_password} onChange={handleChange} required placeholder="••••••••" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm hover:border-gray-300" />
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <ReCAPTCHA ref={recaptchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={setCaptchaValue} onExpired={() => setCaptchaValue(null)} size="normal" />
            </div>

            <button type="submit" disabled={loading || sendingOtp} className="w-full bg-primary hover:bg-primary-accent text-white py-3 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
              {(loading || sendingOtp) && <span className="btn-spinner"></span>}
              {sendingOtp ? 'Sending OTP...' : loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
          <Link to="/" className="block text-center text-xs text-gray-400 mt-2 hover:text-gray-600">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
