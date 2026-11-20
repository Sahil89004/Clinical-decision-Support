import React, { useContext, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, Calendar, Clock, MapPin, Video, X, Clock3, CheckCircle2 } from 'lucide-react';

export default function Appointments() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);

    // Manage appointments in state instead of static array
    const [upcomingAppointments, setUpcomingAppointments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/api/appointments?patient_id=${id}`);
                setUpcomingAppointments(response.data.appointments || []);
            } catch (error) {
                console.error('Error fetching appointments:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAppointments();
    }, [id]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        type: '',
        doctor: 'Dr. Ashish Mishra',
        date: '',
        isVirtual: false
    });

    const getMinDateTime = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const tzOffset = tomorrow.getTimezoneOffset() * 60000;
        return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    const getMaxDateTime = () => {
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 1);
        maxDate.setMonth(maxDate.getMonth() + 1);
        maxDate.setHours(17, 0, 0, 0);
        const tzOffset = maxDate.getTimezoneOffset() * 60000;
        return new Date(maxDate.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    const handleBookVisit = async (e) => {
        e.preventDefault();

        // Validate timing
        const selectedDate = new Date(formData.date);
        const hours = selectedDate.getHours();
        
        if (hours < 9 || hours >= 17) {
            alert("Please select a time during visiting hours (9:00 AM - 5:00 PM).");
            return;
        }

        const newAptData = {
            patient_id: id,
            type: formData.type || 'Consultation',
            doctor_name: formData.doctor,
            date: formData.date || new Date().toISOString(),
            location: formData.isVirtual ? 'Telehealth Portal' : 'City Medical Center, Room 101',
            isVirtual: formData.isVirtual
        };

        try {
            const response = await axios.post('http://localhost:5000/api/appointments', newAptData);
            if (response.data.success) {
                const confirmedApt = {
                    ...newAptData,
                    id: response.data.id,
                    status: response.data.status // Pending
                };
                setUpcomingAppointments(prev => [...prev, confirmedApt].sort((a,b) => new Date(a.date) - new Date(b.date)));
                setIsModalOpen(false);
                setFormData({ type: '', doctor: 'Dr. Sarah Smith', date: '', isVirtual: false });
            }
        } catch (error) {
            console.error('Error booking appointment:', error);
            alert('Failed to book appointment. Please try again.');
        }
    };

    if (user?.role === 'patient' && user.patient_id !== parseInt(id)) {
        return (
            <div className="p-8 max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow-xl border border-red-100 text-center">
                <div className="text-red-500 text-5xl mb-4">⛔</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Link to={`/patient/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-teal-600 mb-6 w-fit">
                <ArrowLeft size={20} /> Back to Dashboard
            </Link>

            <div className="glass-panel p-6 mb-8 bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Calendar size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Appointments</h1>
                        <p className="text-slate-500">Manage your upcoming and past visits.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-teal-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-teal-700 transition-colors shadow-sm cursor-pointer"
                >
                    Book New Visit
                </button>
            </div>

            <h2 className="text-xl font-bold text-slate-700 mb-4 px-1">Upcoming Visits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="glass-panel p-6 bg-white border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${apt.isVirtual ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {apt.isVirtual ? 'Virtual' : 'In-Person'}
                                </span>
                                <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${apt.status === 'Pending' ? 'bg-amber-100 text-amber-700' : apt.status === 'Confirmed' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-700'}`}>
                                    {apt.status === 'Pending' ? <Clock3 size={12}/> : apt.status === 'Confirmed' ? <CheckCircle2 size={12}/> : null}
                                    {apt.status || 'Pending'}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-bold text-slate-800">{new Date(apt.date).toLocaleDateString([], {month: 'short', day: 'numeric'})}</p>
                                <p className="text-sm font-semibold text-teal-600 flex items-center justify-end gap-1">
                                    <Clock size={14} /> {new Date(apt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </p>
                            </div>
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-800">{apt.type}</h3>
                        <p className="text-slate-500 font-medium mb-4">{apt.doctor_name || apt.doctor}</p>
                        
                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {apt.isVirtual ? <Video size={16} className="text-blue-500"/> : <MapPin size={16} className="text-emerald-500" />}
                            {apt.location}
                        </div>
                    </div>
                ))}
            </div>

            {/* Booking Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800">Book Appointment</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleBookVisit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Reason for Visit</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. General Checkup, Follow-up"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={formData.type}
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Select Doctor</label>
                                <select 
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={formData.doctor}
                                    onChange={e => setFormData({...formData, doctor: e.target.value})}
                                >
                                    <option>Dr. Ashish Mishra</option>
                                    <option>Dr. James Wilson</option>
                                    <option>Dr. Emily Chen</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Date & Time</label>
                                <input 
                                    type="datetime-local" 
                                    required 
                                    min={getMinDateTime()}
                                    max={getMaxDateTime()}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                />
                                <p className="text-xs text-slate-500 mt-1">Visiting hours: 9:00 AM - 5:00 PM. Bookings open from tomorrow up to 1 month in advance.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Visit Type</label>
                                <div className="flex gap-4">
                                    <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg p-3 cursor-pointer transition-colors ${!formData.isVirtual ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                        <input type="radio" name="visitType" checked={!formData.isVirtual} onChange={() => setFormData({...formData, isVirtual: false})} className="hidden" />
                                        <MapPin size={18} /> In-Person
                                    </label>
                                    <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg p-3 cursor-pointer transition-colors ${formData.isVirtual ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                        <input type="radio" name="visitType" checked={formData.isVirtual} onChange={() => setFormData({...formData, isVirtual: true})} className="hidden" />
                                        <Video size={18} /> Virtual
                                    </label>
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition-colors mt-6">
                                Confirm Booking
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
