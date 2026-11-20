import React, { useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, FileText, Activity } from 'lucide-react';

export default function MedicalHistory() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);

    // Medical history records
    const historyData = [
        { date: '2023-11-15', diagnosis: 'Hypertension', doctor: 'Dr. Smith', notes: 'Prescribed Lisinopril 10mg. Advised low sodium diet.' },
        { date: '2023-05-22', diagnosis: 'Routine Checkup', doctor: 'Dr. Johnson', notes: 'All vitals normal. Next checkup in 1 year.' },
        { date: '2022-08-10', diagnosis: 'Mild Concussion', doctor: 'Dr. Lee', notes: 'Patient fell. CT scan clear. Advised rest for 48 hours.' }
    ];

    if (user?.role === 'patient' && user.patient_id !== parseInt(id)) {
        return (
            <div className="p-8 max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow-xl border border-red-100 text-center">
                <div className="text-red-500 text-5xl mb-4">⛔</div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                <p className="text-slate-600 mb-6">You are only authorized to view your own health records.</p>
                <Link to="/" className="inline-block bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors">Return to Dashboard</Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Link to={`/patient/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 w-fit">
                <ArrowLeft size={20} /> Back to Dashboard
            </Link>

            <div className="glass-panel p-6 mb-8 bg-white flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <FileText size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Medical History</h1>
                    <p className="text-slate-500">Past diagnoses, treatments, and clinical notes.</p>
                </div>
            </div>

            <div className="space-y-4">
                {historyData.map((item, idx) => (
                    <div key={idx} className="glass-panel p-6 bg-white border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{item.diagnosis}</h3>
                                <p className="text-sm text-slate-500 font-medium">Attending: {item.doctor}</p>
                            </div>
                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-semibold">
                                {new Date(item.date).toLocaleDateString()}
                            </span>
                        </div>
                        <p className="text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
                            "{item.notes}"
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
