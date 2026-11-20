import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { socket } from '../socket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Bell, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import ChatWidget from '../components/ChatWidget';

export default function PatientDetail() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const [history, setHistory] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [patient, setPatient] = useState(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const patientId = parseInt(id);
        if (isNaN(patientId)) {
            setTimeout(() => {
                setPatient({ error: true });
                setLoading(false);
            }, 0);
            return;
        }

        // Fetch Patient Info
        axios.get('http://localhost:5000/api/patients')
            .then(res => {
                const found = res.data.find(p => p.id === patientId);
                if (found) setPatient(found);
                else setPatient({ error: true });
            })
            .catch(err => {
                console.error(err);
                setPatient({ error: true });
            })
            .finally(() => {
                setLoading(false);
            });

        // Fetch History
        axios.get(`http://localhost:5000/api/patients/${patientId}/vitals?limit=50`)
            .then(res => setHistory(res.data.reverse()))
            .catch(err => console.error(err));
            
        // Fetch Alerts
        axios.get(`http://localhost:5000/api/patients/${patientId}/alerts?limit=10`)
            .then(res => setAlerts(res.data))
            .catch(err => console.error(err));

        const handleVital = (data) => {
            if (data.patient_id === parseInt(id)) {
                setHistory(prev => [...prev.slice(-49), data]);
            }
        };

        const handleAlert = (data) => {
            if (data.patient_id === parseInt(id)) {
                setAlerts(prev => [data, ...prev].slice(0, 10)); // keep last 10
            }
        };

        socket.on('vital_update', handleVital);
        socket.on('alert_new', handleAlert);
        return () => {
            socket.off('vital_update', handleVital);
            socket.off('alert_new', handleAlert);
        };
    }, [id]);

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <div className="text-lg font-semibold text-slate-500 animate-pulse">Loading patient data...</div>
            </div>
        );
    }

    // Security and Existence checks
    if (patient && patient.error) {
        return (
            <div className="p-8 max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow-xl border border-red-100 text-center">
                <div className="text-red-500 text-5xl mb-4">⚠️</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Patient Not Found</h2>
                <p className="text-slate-600 mb-6">We couldn't find a record for this patient ID. They might not be registered yet or the ID is invalid.</p>
                <div className="flex justify-center gap-4">
                    <Link to="/" className="inline-block bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-300 transition-colors">Go Back</Link>
                </div>
            </div>
        );
    }

    if (user?.role === 'patient' && user.patient_id !== parseInt(id)) {
        return (
            <div className="p-8 max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow-xl border border-red-100 text-center">
                <div className="text-red-500 text-5xl mb-4">⛔</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                <p className="text-slate-600 mb-6">According to our security policies, you are only authorized to view your own health records.</p>
                <div className="flex justify-center flex-col gap-3">
                    <Link to="/" className="inline-block bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors">Return to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div>
            {user?.role === 'doctor' && (
                <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6">
                    <ArrowLeft size={20} /> Back to Dashboard
                </Link>
            )}

            <div className="glass-panel p-6 mb-8 bg-white">
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-teal-50/80 flex items-center justify-center shadow-sm">
                            <img src="/3d-patient.png" alt="Patient icon" className="w-14 h-14 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{patient.name || 'Unknown Patient'}</h1>
                            <p className="text-slate-500 mt-1 font-medium">ID: {patient.id} • {patient.condition || 'No noted condition'}</p>
                        </div>
                    </div>
                    <div className="text-right">
                       <div className="text-sm font-bold text-slate-400">STATUS</div>
                       <div className="text-xl text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg">STABLE</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Age</span>
                        <span className="font-semibold text-slate-700">{patient.age ? `${patient.age} yrs` : 'N/A'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</span>
                        <span className="font-semibold text-slate-700">{patient.gender || 'Not Specified'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Blood Group</span>
                        <span className="font-semibold text-red-600">{patient.blood_group || 'Unknown'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Height</span>
                        <span className="font-semibold text-slate-700">{patient.height || 'Unknown'}</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Weight</span>
                        <span className="font-semibold text-slate-700">{patient.weight || 'Unknown'}</span>
                    </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600">
                    <span className="font-semibold">Caregiver Contact:</span> {patient.primary_caregiver_phone || 'Not Provided'}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="glass-panel p-5 bg-white border-l-4 border-red-500 flex flex-col justify-center shadow-sm">
                    <span className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">Current Heart Rate</span>
                    <span className="text-4xl font-black text-red-500 tracking-tight">
                        {history.filter(h => h.vital_type === 'heart_rate').pop()?.value || '--'}
                        <span className="text-base font-semibold text-red-300 ml-1">BPM</span>
                    </span>
                </div>
                <div className="glass-panel p-5 bg-white border-l-4 border-blue-500 flex flex-col justify-center shadow-sm">
                    <span className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">SpO2 Level</span>
                    <span className="text-4xl font-black text-blue-500 tracking-tight">
                        {history.filter(h => h.vital_type === 'spo2').pop()?.value || '--'}
                        <span className="text-base font-semibold text-blue-300 ml-1">%</span>
                    </span>
                </div>
                <div className="glass-panel p-5 bg-white border-l-4 border-emerald-500 flex flex-col justify-center shadow-sm">
                    <span className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">Blood Pressure</span>
                    <span className="text-4xl font-black text-emerald-500 tracking-tight flex items-end">
                        120/80 <span className="text-base font-semibold text-emerald-300 ml-1 mb-1 leading-none">mmHg</span>
                    </span>
                    <span className="text-xs text-slate-400 mt-1">Status: Normal</span>
                </div>
                <div className="glass-panel p-5 bg-white border-l-4 border-amber-500 flex flex-col justify-center shadow-sm">
                    <span className="text-xs font-bold text-slate-400 mb-1 tracking-wider uppercase">Body Temp</span>
                    <span className="text-4xl font-black text-amber-500 tracking-tight">
                        36.8 <span className="text-base font-semibold text-amber-300 ml-1">°C</span>
                    </span>
                    <span className="text-xs text-slate-400 mt-1">Status: Normal</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Heart Rate Chart */}
                    <div className="glass-panel p-6 bg-white shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span> Heart Rate Trend
                            </h3>
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">Live Data</span>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history.filter(h => h.vital_type === 'heart_rate')}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="timestamp" tick={false} axisLine={false} tickLine={false} />
                                    <YAxis domain={[40, 160]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <Tooltip labelFormatter={() => ''} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={3} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* SpO2 Chart */}
                    <div className="glass-panel p-6 bg-white shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span> SpO2 Oxygen Trend
                            </h3>
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded">Live Data</span>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history.filter(h => h.vital_type === 'spo2')}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="timestamp" tick={false} axisLine={false} tickLine={false} />
                                    <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                                    <Tooltip labelFormatter={() => ''} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Notifications & Chat */}
                <div className="space-y-6">
                    {/* Chat Widget Inline */}
                    <div className="h-[400px] shadow-lg rounded-2xl overflow-hidden">
                        <ChatWidget 
                            patientId={patient.id} 
                            currentRole={user?.role} 
                            currentUserId={user?.role === 'doctor' ? user.username : patient.name} 
                            inline={true}
                        />
                    </div>

                    <div className="glass-panel p-6 bg-white shadow-sm border border-slate-100 flex flex-col h-[400px]">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Bell size={18} className="text-indigo-500" /> Notifications
                            </h3>
                            {alerts.length > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">{alerts.length} New</span>}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[600px]">
                            {alerts.length === 0 ? (
                                <div className="text-center text-slate-400 py-10 flex flex-col items-center">
                                    <ShieldAlert size={48} className="text-slate-200 mb-3" />
                                    <p>No recent alerts.</p>
                                    <p className="text-sm">Patient status is normal.</p>
                                </div>
                            ) : (
                                alerts.map((alert, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border-l-4 shadow-sm flex gap-3 ${
                                        alert.severity === 'critical' ? 'bg-red-50 border-red-500' :
                                        alert.severity === 'medium' ? 'bg-orange-50 border-orange-500' :
                                        'bg-blue-50 border-blue-500'
                                    }`}>
                                        <div className="mt-1 shrink-0">
                                            {alert.severity === 'critical' ? <AlertTriangle size={18} className="text-red-600" /> :
                                             alert.severity === 'medium' ? <AlertTriangle size={18} className="text-orange-500" /> :
                                             <Info size={18} className="text-blue-500" />}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-semibold mb-1 leading-snug ${
                                                alert.severity === 'critical' ? 'text-red-900' :
                                                alert.severity === 'medium' ? 'text-orange-900' :
                                                'text-blue-900'
                                            }`}>
                                                {alert.message}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                                                {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
