import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../api';

export default function Register() {
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    
    // User details
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        captcha: ''
    });

    // Captcha math
    const [captchaMath, setCaptchaMath] = useState({ a: 0, b: 0 });
    
    // OTPs received via "Email" and "SMS"
    const [expectedOtps, setExpectedOtps] = useState({ email: '', phone: '' });
    
    // User input OTPs
    const [enteredOtps, setEnteredOtps] = useState({ email: '', phone: '' });

    // Initialize captcha on load
    useEffect(() => {
        setCaptchaMath({
            a: Math.floor(Math.random() * 10) + 1,
            b: Math.floor(Math.random() * 10) + 1
        });
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOtpChange = (e) => {
        setEnteredOtps({ ...enteredOtps, [e.target.name]: e.target.value });
    };

    const handleStep1Submit = (e) => {
        e.preventDefault();
        
        // Basic validation
        if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.captcha) {
            alert("Please fill in all fields.");
            return;
        }

        if (formData.password.length < 8) {
            alert("Password must be at least 8 characters long.");
            return;
        }

        // Verify captcha
        if (parseInt(formData.captcha) !== (captchaMath.a + captchaMath.b)) {
            alert("Incorrect captcha answer! Please try again.");
            // Reset captcha
            setCaptchaMath({
                a: Math.floor(Math.random() * 10) + 1,
                b: Math.floor(Math.random() * 10) + 1
            });
            setFormData({ ...formData, captcha: '' });
            return;
        }

        // Generate and send OTPs
        const generatedEmailOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const generatedPhoneOtp = Math.floor(1000 + Math.random() * 9000).toString();
        
        setExpectedOtps({ email: generatedEmailOtp, phone: generatedPhoneOtp });
        
        // Show alert
        alert(`Email OTP sent to ${formData.email}: ${generatedEmailOtp}\nSMS OTP sent to ${formData.phone}: ${generatedPhoneOtp}`);
        
        setStep(2);
    };

    const handleStep2Submit = async (e) => {
        e.preventDefault();
        
        if (enteredOtps.email !== expectedOtps.email) {
            alert("Invalid Email OTP!");
            return;
        }
        if (enteredOtps.phone !== expectedOtps.phone) {
            alert("Invalid Phone OTP!");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    password: formData.password
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                alert(data.error || "Registration failed");
                return;
            }

            // Success - redirect to login
            alert("Registration and verification successful! Please login.");
            navigate('/login', { state: { message: "Registration successful! Please login with your new credentials." } });
        } catch (error) {
            console.error('Registration error:', error);
            alert("Could not connect to server.");
        }
    };

    return (
        <div 
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
            style={{ 
                backgroundImage: "url('/login-bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}
        >
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"></div>

            <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
                
                <div className="flex flex-col items-center mb-8 drop-shadow-lg">
                    <img src="/logo.png" alt="SK Logo" className="w-16 h-16 object-contain rounded-2xl bg-white/80 p-2 shadow-2xl mb-4" />
                    <h1 className="text-3xl font-extrabold text-white tracking-tight text-center">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-emerald-300">Patient Registration</span>
                    </h1>
                </div>

                <div className="w-full bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40 border-t-4 border-t-teal-500">
                    
                    {step === 1 && (
                        <form onSubmit={handleStep1Submit} className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Step 1: Basic Details</h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                    <input 
                                        name="name" value={formData.name} onChange={handleInputChange}
                                        className="w-full p-2.5 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm" 
                                        placeholder="John Doe" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Number</label>
                                    <input 
                                        name="phone" value={formData.phone} onChange={handleInputChange}
                                        className="w-full p-2.5 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm" 
                                        placeholder="+1 234 567 8900" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                                    <input 
                                        name="email" type="email" value={formData.email} onChange={handleInputChange}
                                        className="w-full p-2.5 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm" 
                                        placeholder="john@example.com" 
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Create Password</label>
                                    <input 
                                        name="password" type="password" value={formData.password} onChange={handleInputChange}
                                        className="w-full p-2.5 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm" 
                                        placeholder="Min. 8 characters" 
                                        minLength="8"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Security Verification (Captcha)</label>
                                <div className="flex items-center gap-4">
                                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-300 font-mono text-lg font-bold text-slate-800 tracking-wider shadow-inner">
                                        {captchaMath.a} + {captchaMath.b} =
                                    </div>
                                    <input 
                                        name="captcha" value={formData.captcha} onChange={handleInputChange}
                                        className="w-24 p-2 rounded-lg bg-white border border-slate-300 focus:ring-2 focus:ring-teal-500 outline-none text-center font-bold text-lg" 
                                        placeholder="?" 
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-all transform active:scale-[0.98] mt-6 cursor-pointer">
                                Continue to Verification
                            </button>
                            
                            <div className="text-center mt-4">
                                <Link to="/login" className="text-sm font-bold text-slate-500 hover:text-slate-700 hover:underline">
                                    ← Back to Login
                                </Link>
                            </div>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleStep2Submit} className="space-y-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-2 border-b pb-2">Step 2: Two-Factor Verification</h2>
                            <p className="text-sm text-slate-600 mb-6">
                                We've sent a 4-digit code to your email and your mobile number. Please enter them below to verify your account.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Verification Code</label>
                                    <p className="text-xs text-slate-500 mb-2">Sent to: <span className="font-semibold text-slate-700">{formData.email}</span></p>
                                    <input 
                                        name="email" value={enteredOtps.email} onChange={handleOtpChange}
                                        className="w-full p-3 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm text-center tracking-[0.5em] font-mono text-xl" 
                                        placeholder="••••" 
                                        maxLength="4"
                                    />
                                </div>

                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile Verification Code</label>
                                    <p className="text-xs text-slate-500 mb-2">Sent to: <span className="font-semibold text-slate-700">{formData.phone}</span></p>
                                    <input 
                                        name="phone" value={enteredOtps.phone} onChange={handleOtpChange}
                                        className="w-full p-3 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-center tracking-[0.5em] font-mono text-xl" 
                                        placeholder="••••" 
                                        maxLength="4"
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-all transform active:scale-[0.98] mt-6 cursor-pointer">
                                Verify & Register
                            </button>
                            
                            <div className="text-center mt-4">
                                <button type="button" onClick={() => setStep(1)} className="text-sm font-bold text-slate-500 hover:text-slate-700 hover:underline cursor-pointer">
                                    ← Edit Details
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
