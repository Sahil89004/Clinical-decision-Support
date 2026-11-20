import React, { useContext, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Activity, Users, LogOut, FileText, Calendar, Share2, AlertTriangle } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { socket } from '../socket';

export default function Layout() {
    const { user, setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || user.role !== 'doctor') return;

        const handleEmergency = (data) => {
            alert(`🚨 EMERGENCY ALERT 🚨\nPriority alert for Patient ID: ${data.patientId}\nPlease check the dashboard immediately.`);
        };

        socket.on('emergency_alert', handleEmergency);

        return () => {
            socket.off('emergency_alert', handleEmergency);
        };
    }, [user]);

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:5000/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (error) {
            console.error('Logout error:', error);
        }
        setUser(null);
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-slate-50">
            <aside className="w-64 bg-slate-900 text-white p-4 hidden md:flex flex-col shadow-2xl">
                <div className="mb-8 p-2">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="SK Logo" className="w-10 h-10 object-contain rounded-md" />
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                            SK
                        </h1>
                    </div>
                    <p className="text-xs text-slate-400 ml-13 mt-1">Clinical Decision Support</p>
                </div>
                
                <nav className="flex-1 space-y-2">
                    {user?.role === 'doctor' && (
                        <Link to="/" className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white">
                            <Users size={20} /> Patients
                        </Link>
                    )}
                    {user?.role === 'patient' && (
                        <>
                            <Link to={`/patient/${user.patient_id}`} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white">
                                <Activity size={20} /> Dashboard
                            </Link>
                            <Link to={`/patient/${user.patient_id}/history`} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white">
                                <FileText size={20} /> Medical History
                            </Link>
                            <Link to={`/patient/${user.patient_id}/appointments`} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white">
                                <Calendar size={20} /> Appointments
                            </Link>
                            <Link to={`/patient/${user.patient_id}/shared`} className="flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition-colors text-slate-300 hover:text-white">
                                <Share2 size={20} /> Shared Records
                            </Link>
                        </>
                    )}
                </nav>
                
                <div className="border-t border-slate-800 pt-4">
                    <button onClick={handleLogout} className="flex items-center gap-3 p-3 w-full hover:bg-slate-800 rounded-lg transition-colors text-red-400 hover:text-red-300 cursor-pointer">
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </aside>
            
            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white border-t border-slate-800 flex justify-around items-center p-3 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] pb-[env(safe-area-inset-bottom,0.75rem)]">
                {user?.role === 'doctor' && (
                    <Link to="/" className="flex flex-col items-center gap-1 text-slate-300 hover:text-white">
                        <Users size={20} /> <span className="text-[10px] font-medium">Patients</span>
                    </Link>
                )}
                {user?.role === 'patient' && (
                    <>
                        <Link to={`/patient/${user.patient_id}`} className="flex flex-col items-center gap-1 text-slate-300 hover:text-white">
                            <Activity size={20} /> <span className="text-[10px] font-medium">Home</span>
                        </Link>
                        <Link to={`/patient/${user.patient_id}/history`} className="flex flex-col items-center gap-1 text-slate-300 hover:text-white">
                            <FileText size={20} /> <span className="text-[10px] font-medium">History</span>
                        </Link>
                        <Link to={`/patient/${user.patient_id}/appointments`} className="flex flex-col items-center gap-1 text-slate-300 hover:text-white">
                            <Calendar size={20} /> <span className="text-[10px] font-medium">Visits</span>
                        </Link>
                        <Link to={`/patient/${user.patient_id}/shared`} className="max-sm:hidden flex flex-col items-center gap-1 text-slate-300 hover:text-white">
                            <Share2 size={20} /> <span className="text-[10px] font-medium">Shared</span>
                        </Link>
                    </>
                )}
                <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-red-400 hover:text-red-300 cursor-pointer">
                    <LogOut size={20} /> <span className="text-[10px] font-medium">Logout</span>
                </button>
            </div>
            <main className="flex-1 overflow-auto relative pb-20 md:pb-0">
                 <div className="p-6 max-w-7xl mx-auto min-h-full">
                    <Outlet />
                 </div>
            </main>
        </div>
    )
}
