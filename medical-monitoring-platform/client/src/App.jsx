import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';
import MedicalHistory from './pages/MedicalHistory';
import Appointments from './pages/Appointments';
import SharedRecords from './pages/SharedRecords';
import Layout from './components/Layout';

import { AuthContext } from './contexts/AuthContext';
function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(err => console.error("Session fetch error", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-50"><div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"}>
      <AuthContext.Provider value={{ user, setUser }}>
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={
                        user ? <Layout /> : <Navigate to="/login" />
                    }>
                        <Route index element={
                            user?.role === 'patient' 
                                ? <Navigate to={`/patient/${user.patient_id}`} replace /> 
                                : <Dashboard />
                        } />
                        <Route path="patient/:id" element={<PatientDetail />} />
                        <Route path="patient/:id/history" element={<MedicalHistory />} />
                        <Route path="patient/:id/appointments" element={<Appointments />} />
                        <Route path="patient/:id/shared" element={<SharedRecords />} />
                    </Route>
                </Routes>
            </Router>
        </div>
      </AuthContext.Provider>
    </GoogleOAuthProvider>
  );
}

export default App;
