import React, { useState } from 'react';
import { X, ShieldCheck, Mail, Lock, KeyRound, AlertCircle, UserCheck } from 'lucide-react';
import { isUserAdmin, verifyAdminPin, ADMIN_ACCOUNTS } from '../firebase';

export default function AdminLoginModal({ 
  isOpen, 
  onClose, 
  onLoginSuccess 
}) {
  const [email, setEmail] = useState('charliepjooste@gmail.com');
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = passcode.trim();

    if (!cleanEmail) {
      setErrorMsg('Please enter your admin email address.');
      return;
    }

    if (!isUserAdmin(cleanEmail)) {
      setErrorMsg('Unauthorized admin email. Access is restricted to authorized event organizers.');
      return;
    }

    if (!cleanPin) {
      setErrorMsg('Please enter your Admin PIN to log in.');
      return;
    }

    // Verify respective Admin PIN (Charlie = Coolcat, Nicole = Coolcat1)
    if (verifyAdminPin(cleanEmail, cleanPin)) {
      localStorage.setItem('sloan_admin_authenticated', 'true');
      localStorage.setItem('sloan_admin_email', cleanEmail);
      if (onLoginSuccess) onLoginSuccess(cleanEmail);
      setErrorMsg('');
      setPasscode('');
      onClose();
    } else {
      setErrorMsg(`Incorrect PIN for ${cleanEmail}. Please enter the correct admin PIN.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md glass-modal rounded-3xl overflow-hidden border border-purple-200 shadow-2xl bg-white flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-white/10 border border-white/20">
              <ShieldCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide">Admin Portal Login</h2>
              <span className="text-[11px] text-purple-200 font-medium">Organizer PIN Authentication Required</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleAdminLogin} className="p-6 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-bold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Select Buttons */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-700">Select Organizer Account:</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('charliepjooste@gmail.com');
                  setErrorMsg('');
                }}
                className={`p-2.5 rounded-xl border text-[11px] font-bold text-left transition ${email === 'charliepjooste@gmail.com' ? 'border-2 border-purple-600 bg-purple-50 text-purple-950 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-purple-50'}`}
              >
                Charlie Jooste
                <span className="block text-[9px] text-slate-400 font-mono truncate">charliepjooste@gmail.com</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('nicolejooste8@gmail.com');
                  setErrorMsg('');
                }}
                className={`p-2.5 rounded-xl border text-[11px] font-bold text-left transition ${email === 'nicolejooste8@gmail.com' ? 'border-2 border-purple-600 bg-purple-50 text-purple-950 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-purple-50'}`}
              >
                Nicole Jooste
                <span className="block text-[9px] text-slate-400 font-mono truncate">nicolejooste8@gmail.com</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-black text-slate-900 mb-1.5">Admin Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-purple-700 absolute left-3.5 top-3" />
              <input 
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="e.g. charliepjooste@gmail.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-purple-600 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-black text-slate-900 mb-1.5">Enter Admin PIN *</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-purple-700 absolute left-3.5 top-3" />
              <input 
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Enter your organizer PIN"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-purple-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:border-purple-600 text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-lg transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Sign In to Admin Console
            </button>
          </div>

          <p className="text-[11px] text-center text-slate-500 font-medium">
            Authorized Organizers: Nicole Jooste • Charlie Jooste
          </p>
        </form>

      </div>
    </div>
  );
}
