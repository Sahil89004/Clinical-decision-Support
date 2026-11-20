import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { socket } from '../socket';
import { Link } from 'react-router-dom';
import { Heart, Activity, AlertTriangle, CalendarCheck, Clock, Check, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { API_URL } from '../api';

export default function Dashboard() {
    const [patients, setPatients] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        // Fetch initial data
        axios.get(`${API_URL}/api/patients`)
            .then(res => setPatients(res.data))
            .catch(err => console.error(err));

        axios.get(`${API_URL}/api/appointments`)
            .then(res => setAppointments(res.data.appointments || []))
            .catch(err => console.error(err));

        // Socket listeners
        socket.on('vital_update', (data) => {
            setPatients(prev => prev.map(p => 
                p.id === data.patient_id 
                ? { ...p, last_vital: data } 
                : p
            ));
        });

        socket.on('alert_new', (alert) => {
            setAlerts(prev => [alert, ...prev].slice(0, 5));
        });

        return () => {
            socket.off('vital_update');
            socket.off('alert_new');
        };
    }, []);

    const handleConfirmAppointment = async (id) => {
        try {
            await axios.put(`${API_URL}/api/appointments/${id}`, { status: 'Confirmed' });
            setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status: 'Confirmed' } : apt));
        } catch (error) {
            console.error('Error confirming appointment:', error);
        }
    };

    const handleRescheduleAppointment = async (id, currentApt) => {
        const newDateStr = prompt(`Enter new date and time for ${currentApt.patient_id} (Format: YYYY-MM-DDTHH:MM, e.g., 2026-03-20T14:30):`, currentApt.date.slice(0, 16));
        if (!newDateStr) return;
        
        try {
            await axios.put(`${API_URL}/api/appointments/${id}`, { status: 'Rescheduled', date: new Date(newDateStr).toISOString() });
            setAppointments(prev => prev.map(apt => apt.id === id ? { ...apt, status: 'Rescheduled', date: new Date(newDateStr).toISOString() } : apt));
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            alert('Invalid date format or server error.');
        }
    };

    const pendingAppointments = appointments.filter(a => a.status === 'Pending' || a.status === 'Rescheduled');

    return (
        <div className="space-y-8">
            
            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="mb-8 space-y-2">
                    {alerts.map((alert, i) => {
                        const patient = patients.find(p => p.id === alert.patient_id);
                        const patientName = patient ? patient.name : `Patient #${alert.patient_id}`;
                        return (
                        <div key={i} className={clsx(
                            "p-4 rounded-lg flex items-center gap-3 shadow-md animate-pulse",
                            alert.severity === 'critical' ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500'
                        )}>
                            <AlertTriangle size={20} />
                            <span className="font-bold">ALERT ({patientName}):</span> {alert.message}
                            <span className="text-sm ml-auto text-slate-500">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                        </div>
                    )})}
                </div>
            )}

            {/* Appointment Requests Section */}
            {pendingAppointments.length > 0 && (
                <div>
                    <h2 className="text-2xl font-bold mb-4 text-slate-800 flex items-center gap-2">
                        <CalendarCheck className="text-teal-600" />
                        Appointment Requests
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pendingAppointments.map(apt => {
                            const patient = patients.find(p => p.id === apt.patient_id);
                            const patientName = patient ? patient.name : `Patient #${apt.patient_id}`;
                            return (
                            <div key={apt.id} className="glass-panel p-5 bg-white border-l-4 border-amber-500 hover:shadow-lg transition-all flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-slate-800">{patientName}</h3>
                                        <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${apt.status === 'Rescheduled' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {apt.status}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 font-medium mb-1">{apt.type} • {apt.isVirtual ? 'Virtual' : 'In-Person'}</p>
                                    <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                                        <Clock size={14}/> {new Date(apt.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleConfirmAppointment(apt.id)}
                                        className="flex-1 bg-teal-50 text-teal-700 font-semibold py-2 rounded border border-teal-200 hover:bg-teal-600 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <Check size={16} /> Confirm
                                    </button>
                                    <button 
                                        onClick={() => handleRescheduleAppointment(apt.id, apt)}
                                        className="flex-1 bg-blue-50 text-blue-700 font-semibold py-2 rounded border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                        <RefreshCw size={16} /> Reschedule
                                    </button>
                                </div>
                            </div>
                        )})}
                    </div>
                </div>
            )}

            {/* Patient Grid */}
            <div>
                <h2 className="text-3xl font-bold mb-6 text-slate-800 tracking-tight">Patient Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {patients.map(patient => (
                    <Link key={patient.id} to={`/patient/${patient.id}`} className="block">
                        <div className="glass-panel p-6 bg-white hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer border-t-4 border-blue-500 relative overflow-hidden">
                            <div className="absolute -right-6 -top-6 w-24 h-24 opacity-10 blur-[1px]">
                                <img src="/3d-patient.png" alt="watermark" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{patient.name}</h3>
                                    <p className="text-slate-500 text-sm">{patient.age} yrs • {patient.condition}</p>
                                </div>
                                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                                    MONITORING
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-6 mt-4">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Heart className="text-red-500" size={18} />
                                    <span className="text-lg font-mono font-bold">
                                        {patient.last_vital?.vital_type === 'heart_rate' ? patient.last_vital.value : '--'}
                                    </span>
                                    <span className="text-xs">bpm</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Activity className="text-blue-500" size={18} />
                                    <span className="text-lg font-mono font-bold">
                                        {patient.last_vital?.vital_type === 'spo2' ? patient.last_vital.value : '--'}
                                    </span>
                                    <span className="text-xs">%</span>
                                </div>
                            </div>
                        </div>
                    </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
