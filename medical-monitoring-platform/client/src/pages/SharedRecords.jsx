import React, { useContext, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { ArrowLeft, Share2, FileType, UploadCloud, Download, Eye, X } from 'lucide-react';

export default function SharedRecords() {
    const { id } = useParams();
    const { user } = useContext(AuthContext);

    // Manage records in state
    const [records, setRecords] = useState([
        { id: 101, name: 'Complete Blood Count (CBC)', type: 'Blood Report', format: 'PDF', size: '2.4 MB', date: '2025-12-01', sharedBy: 'LabCorp' },
        { id: 102, name: 'Chest X-Ray Results', type: 'X-Ray', format: 'IMG', size: '14.1 MB', date: '2025-11-20', sharedBy: 'Imaging Center' },
        { id: 103, name: 'Specialist Referral Notes', type: 'Clinical Note', format: 'DOC', size: '1.1 MB', date: '2025-10-05', sharedBy: 'Dr. Johnson' },
    ]);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadData, setUploadData] = useState({
        name: '',
        type: 'Blood Report',
        fileFormat: ''
    });

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        
        // Auto-assign format based on selection or file name
        let format = 'PDF';
        if (uploadData.type === 'X-Ray' || uploadData.type === 'MRI / CT Scan') format = 'IMG';

        const newDoc = {
            id: Date.now(),
            name: uploadData.name || 'Uploaded Document',
            type: uploadData.type,
            format: format,
            size: (Math.random() * 5 + 0.5).toFixed(1) + ' MB',
            date: new Date().toISOString().split('T')[0],
            sharedBy: 'Patient Upload'
        };

        setRecords(prev => [newDoc, ...prev]);
        setIsUploadModalOpen(false);
        setUploadData({ name: '', type: 'Blood Report', fileFormat: '' });
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
            <Link to={`/patient/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-purple-600 mb-6 w-fit">
                <ArrowLeft size={20} /> Back to Dashboard
            </Link>

            <div className="glass-panel p-6 mb-8 bg-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Share2 size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Shared Records</h1>
                        <p className="text-slate-500">Documents, lab results, and imaging shared with you.</p>
                    </div>
                </div>
                <button 
                    onClick={() => setIsUploadModalOpen(true)}
                    className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
                >
                    <UploadCloud size={18} /> Upload Document
                </button>
            </div>

            <div className="glass-panel bg-white overflow-hidden shadow-sm border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider border-b border-slate-200">
                                <th className="p-4 font-semibold">Document Name</th>
                                <th className="p-4 font-semibold">Source</th>
                                <th className="p-4 font-semibold">Date</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.map((doc) => (
                                <tr key={doc.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${doc.format === 'PDF' ? 'bg-red-50 text-red-500' : doc.format === 'IMG' ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500'}`}>
                                                <FileType size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800">{doc.name}</p>
                                                <p className="text-xs text-slate-400 font-medium">{doc.type} • {doc.format} • {doc.size}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-slate-600 font-medium">{doc.sharedBy}</td>
                                    <td className="p-4 text-slate-500">{new Date(doc.date).toLocaleDateString()}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="View">
                                                <Eye size={18} />
                                            </button>
                                            <button className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Download">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800">Upload Shared Record</h3>
                            <button onClick={() => setIsUploadModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Document Category/Type</label>
                                <select 
                                    required
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={uploadData.type}
                                    onChange={e => setUploadData({...uploadData, type: e.target.value})}
                                >
                                    <option value="Blood Report">Blood Report (CBC, Lipid, etc.)</option>
                                    <option value="X-Ray">X-Ray Imaging</option>
                                    <option value="MRI / CT Scan">MRI / CT Scan</option>
                                    <option value="Prescription">Prescription</option>
                                    <option value="Clinical Note">Clinical Note / History</option>
                                    <option value="Other">Other Document</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Document Name / Description</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Recent Bloodwork Results"
                                    className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={uploadData.name}
                                    onChange={e => setUploadData({...uploadData, name: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Select File to Upload</label>
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors mt-2">
                                    <UploadCloud size={32} className="mx-auto text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-500 font-medium">Click to browse or drag & drop file here</p>
                                    <p className="text-xs text-slate-400 mt-1">Supports PDF, JPG, PNG (Max 50MB)</p>
                                    <input type="file" required className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer" />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors mt-6 shadow-sm cursor-pointer">
                                Upload and Save
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
