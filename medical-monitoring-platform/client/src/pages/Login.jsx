import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../api';

export default function Login() {
    const { setUser } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // State to hold form inputs
    const [doctorCreds, setDoctorCreds] = useState({ username: '', password: '' });
    const [patientCreds, setPatientCreds] = useState({ username: '', password: '' });
    const [errorMsg, setErrorMsg] = useState('');

    const handleLogin = async (e, role) => {
        if (e) e.preventDefault();
        setErrorMsg(''); // Reset error
        
        let credentials = role === 'doctor' ? doctorCreds : patientCreds;
        
        // Handle Google logic specially
        if (role === 'google') {
            window.location.href = `${API_URL}/auth/google`;
            return;
        }

        if (!credentials.username || !credentials.password) {
            setErrorMsg("Please enter both username and password.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: credentials.username,
                    password: credentials.password,
                    role: role
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                setErrorMsg(data.error || "Login failed");
                return;
            }

            // Success
            setUser({ 
                name: data.user.username, 
                role: data.user.role,
                ...data.user
            });
            navigate('/');
        } catch (error) {
            console.error('Login error:', error);
            setErrorMsg("Could not connect to server.");
        }
    };

    return (
        <div 
            className="flex min-h-screen items-center justify-center p-4 relative overflow-hidden"
            style={{ 
                backgroundImage: "url('/3d-login-bg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed'
            }}
        >
            {/* Subtle dark overlay for better text contrast if the image is bright */}
            <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px]"></div>

            <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">
                
                {/* Header / Logo Area */}
                <div className="flex flex-col items-center mb-10 drop-shadow-lg">
                    <img src="/logo.png" alt="SK Logo" className="w-20 h-20 object-contain rounded-2xl bg-white/80 p-2 shadow-2xl mb-4" />
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight text-center">
                        Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">SK</span>
                    </h1>
                    <p className="text-slate-100 mt-2 text-lg drop-shadow-md">Advanced Clinical Decision Support</p>
                </div>

                {/* Login Boxes Container */}
                {errorMsg && (
                    <div className="w-full mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 font-medium rounded shadow-sm text-center">
                        {errorMsg}
                    </div>
                )}
                <div className="flex flex-col md:flex-row gap-8 w-full">
                    
                    {/* Doctor Login Box */}
                    <div className="flex-1 bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(37,99,235,0.2)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 rounded-full bg-blue-50/50 flex items-center justify-center -ml-1">
                                <img src="/3d-doctor.png" alt="Doctor Portal" className="w-16 h-16 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Doctor Portal</h2>
                                <p className="text-sm text-slate-500 font-medium">Access clinical dashboard</p>
                            </div>
                        </div>
                        
                        <form onSubmit={(e) => handleLogin(e, 'doctor')} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                                <input 
                                    className="w-full p-3 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm" 
                                    placeholder="doctor@medical.org" 
                                    value={doctorCreds.username}
                                    onChange={(e) => setDoctorCreds({...doctorCreds, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                                <input 
                                    className="w-full p-3 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm" 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={doctorCreds.password}
                                    onChange={(e) => setDoctorCreds({...doctorCreds, password: e.target.value})}
                                />
                            </div>
                            <button className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] mt-2 cursor-pointer">
                                Secure Doctor Login
                            </button>
                        </form>
                    </div>

                    {/* Patient Login Box */}
                    <div className="flex-1 bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40 transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(13,148,136,0.2)]">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-14 h-14 rounded-full bg-teal-50/50 flex items-center justify-center -ml-1">
                                <img src="/3d-patient.png" alt="Patient Portal" className="w-16 h-16 object-contain drop-shadow-md hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Patient Portal</h2>
                                <p className="text-sm text-slate-500 font-medium">Access your health records</p>
                            </div>
                        </div>
                        
                        <form onSubmit={(e) => handleLogin(e, 'patient')} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                                <input 
                                    className="w-full p-3 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all shadow-sm" 
                                    placeholder="john@patient.org" 
                                    value={patientCreds.username}
                                    onChange={(e) => setPatientCreds({...patientCreds, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                                <input 
                                    className="w-full p-3 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all shadow-sm" 
                                    type="password" 
                                    placeholder="••••••••" 
                                    value={patientCreds.password}
                                    onChange={(e) => setPatientCreds({...patientCreds, password: e.target.value})}
                                />
                            </div>
                            <button className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-all transform active:scale-[0.98] mt-2 cursor-pointer">
                                Secure Patient Login
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-slate-300"></div>
                                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-semibold">Or continue with</span>
                                <div className="flex-grow border-t border-slate-300"></div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button type="button" onClick={(e) => handleLogin(e, 'google')} className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    Google
                                </button>
                            </div>

                            <div className="text-center mt-6">
                                <p className="text-sm text-slate-600">
                                    New patient? <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700 hover:underline">Register here</Link>
                                </p>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
