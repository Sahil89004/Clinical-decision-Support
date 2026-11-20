const express = require('express');
const router = express.Router();
const db = require('../db');
const { analyzeVitals } = require('../services/monitor');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireRole, requirePatientAccess } = require('../middleware/auth');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedMimeTypes = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'application/pdf': '.pdf'
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + allowedMimeTypes[file.mimetype]);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, Boolean(allowedMimeTypes[file.mimetype]))
});

function handleUpload(req, res, next) {
    upload.single('file')(req, res, (err) => {
        if (err) {
            const status = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return res.status(status).json({ error: err.message });
        }

        next();
    });
}

// POST /api/ingest - Receive data from devices
router.post('/ingest', (req, res, next) => {
    if (!process.env.DEVICE_API_KEY || req.get('x-device-key') !== process.env.DEVICE_API_KEY) {
        return res.status(401).json({ error: 'Invalid device key' });
    }

    next();
}, (req, res) => {
    const { patient_id, device_id, vital_type, value, unit, event_probability, timestamp } = req.body;

    if (!Number.isInteger(patient_id) || patient_id < 1 ||
        !['heart_rate', 'spo2'].includes(vital_type) ||
        typeof value !== 'number' || !Number.isFinite(value)) {
        return res.status(400).json({ error: 'Invalid patient or vital data' });
    }

    db.get('SELECT id FROM patients WHERE id = ?', [patient_id], (err, patient) => {
        if (err) {
            console.error('Database error checking ingest patient:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!patient) {
            return res.status(400).json({ error: 'Unknown patient' });
        }

        const io = req.app.get('io');
        const ts = timestamp || new Date().toISOString();
        const stmt = db.prepare(`
            INSERT INTO vitals (patient_id, device_id, timestamp, vital_type, value, unit)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        stmt.run(patient_id, device_id, ts, vital_type, value, unit, function(insertErr) {
            if (insertErr) {
                console.error('DB Insert Error:', insertErr);
                return res.status(500).json({ error: 'Database error' });
            }

            const alerts = analyzeVitals(req.body);
            alerts.forEach(alert => {
                console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
                db.run(
                    'INSERT INTO alerts (patient_id, severity, message, timestamp) VALUES (?, ?, ?, ?)',
                    [patient_id, alert.severity, alert.message, ts]
                );
                io.to('doctors').to(`patient_${patient_id}`).emit('alert_new', { ...alert, patient_id, timestamp: ts });

                if (alert.severity === 'critical') {
                    // SMS notifications are not configured yet.
                }
            });

            io.to('doctors').to(`patient_${patient_id}`).emit('vital_update', {
                patient_id,
                vital_type,
                value,
                timestamp: ts,
                alerts_generated: alerts.length
            });

            res.json({ success: true, alerts: alerts.length });
        });
        stmt.finalize();
    });
});

// POST /api/register - Register a new user
router.post('/register', (req, res) => {
    const { name, email, phone, password } = req.body;

    if (typeof name !== 'string' || !name.trim() ||
        typeof email !== 'string' || !email.trim() ||
        typeof phone !== 'string' || !phone.trim() ||
        typeof password !== 'string') {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    bcrypt.hash(password, 10, (hashErr, passwordHash) => {
        if (hashErr) {
            console.error('Password hashing error:', hashErr);
            return res.status(500).json({ error: 'Registration failed' });
        }

        db.run(
            'INSERT INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
            [name, email, passwordHash, 'patient', phone],
            function(err) {
                if (err) {
                    console.error('Registration error:', err);
                    if (err.message.includes('UNIQUE')) {
                        return res.status(409).json({ error: 'Email or username already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }

                db.run(
                    'INSERT INTO patients (name, primary_caregiver_phone) VALUES (?, ?)',
                    [name, phone],
                    (patientErr) => {
                        if (patientErr) {
                            console.error('Patient record creation error:', patientErr);
                            return res.status(500).json({ error: 'Patient record creation failed' });
                        }

                        res.json({ success: true, message: 'Registration successful' });
                    }
                );
            }
        );
    });
});

// POST /api/login - Verify user credentials
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    if (typeof username !== 'string' || !username.trim() ||
        typeof password !== 'string' || !password ||
        !['doctor', 'patient'].includes(role)) {
        return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    db.get(`SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?`, [username, username, username], (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user || user.role !== role) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password_hash, (compareErr, matches) => {
            if (compareErr) {
                console.error('Password comparison error:', compareErr);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!matches) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const completeLogin = (patientId = null) => {
                if (user.role === 'patient' && !patientId) {
                    return res.status(403).json({ error: 'Patient record not found' });
                }

                const sessionUser = { ...user, patient_id: patientId };
                req.login(sessionUser, (loginErr) => {
                    if (loginErr) {
                        console.error('Session creation error:', loginErr);
                        return res.status(500).json({ error: 'Login failed' });
                    }

                    const { password_hash, ...safeUser } = sessionUser;
                    res.json({ success: true, user: safeUser });
                });
            };

            if (user.role !== 'patient') {
                return completeLogin();
            }

            const findPatientByName = () => db.get(
                'SELECT id FROM patients WHERE name = ? ORDER BY id LIMIT 1',
                [user.username],
                (patientErr, patient) => {
                    if (patientErr) {
                        console.error('Database error finding patient:', patientErr);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    completeLogin(patient && patient.id);
                }
            );

            if (!user.phone) {
                return findPatientByName();
            }

            db.get(
                'SELECT id FROM patients WHERE primary_caregiver_phone = ? ORDER BY id LIMIT 1',
                [user.phone],
                (patientErr, patient) => {
                    if (patientErr) {
                        console.error('Database error finding patient:', patientErr);
                        return res.status(500).json({ error: 'Internal server error' });
                    }
                    if (patient) {
                        return completeLogin(patient.id);
                    }
                    findPatientByName();
                }
            );
        });
    });
});

router.use((req, res, next) => {
    if (req.path === '/auth' || req.path.startsWith('/auth/')) {
        return next();
    }

    return requireAuth(req, res, next);
});

// GET /api/patients - List all patients with latest status
router.get('/patients', (req, res) => {
    if (!['doctor', 'patient'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const patientOnly = req.user.role === 'patient';
    const query = patientOnly ? 'SELECT * FROM patients WHERE id = ?' : 'SELECT * FROM patients';
    const params = patientOnly ? [req.user.patient_id] : [];
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET /api/patients/:id/vitals - History
router.get('/patients/:id/vitals', (req, res) => {
    if (!requirePatientAccess(req.params.id, req, res)) return;
    const { limit } = req.query;
    const l = limit ? parseInt(limit) : 50;
    db.all(`SELECT * FROM vitals WHERE patient_id = ? ORDER BY timestamp DESC LIMIT ?`, 
        [req.params.id, l], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
    });
});

// GET /api/patients/:id/alerts - History
router.get('/patients/:id/alerts', (req, res) => {
    if (!requirePatientAccess(req.params.id, req, res)) return;
    const { limit } = req.query;
    const l = limit ? parseInt(limit) : 50;
    db.all(`SELECT * FROM alerts WHERE patient_id = ? ORDER BY timestamp DESC LIMIT ?`, 
        [req.params.id, l], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
    });
});

// GET /api/alerts - Active alerts
router.get('/alerts', (req, res) => {
    if (!['doctor', 'patient'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const query = req.user.role === 'patient'
        ? 'SELECT * FROM alerts WHERE patient_id = ? ORDER BY timestamp DESC LIMIT 50'
        : 'SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50';
    const params = req.user.role === 'patient' ? [req.user.patient_id] : [];
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// ==========================================
// APPOINTMENTS API
// ==========================================

// GET /api/appointments - fetch for patient or doctor
router.get('/appointments', (req, res) => {
    if (!['doctor', 'patient'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { patient_id } = req.query;
    
    let query = `SELECT * FROM appointments ORDER BY date ASC`;
    let params = [];
    
    if (req.user.role === 'patient') {
        if (patient_id && Number(patient_id) !== Number(req.user.patient_id)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        query = `SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC`;
        params = [req.user.patient_id];
    } else if (patient_id) {
        query = `SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC`;
        params = [patient_id];
    }
    
    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'DB Error fetching appointments' });
        res.json({ appointments: rows });
    });
});

// POST /api/appointments - create appointment request
router.post('/appointments', (req, res) => {
    const { patient_id, doctor_name, type, date, location, isVirtual } = req.body;
    if (req.user.role === 'patient' && patient_id &&
        Number(patient_id) !== Number(req.user.patient_id)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const requestedPatientId = req.user.role === 'patient' ? req.user.patient_id : patient_id;
    
    if (!requestedPatientId || !date || !doctor_name) {
        return res.status(400).json({ error: 'Missing required appointment fields' });
    }
    if (!requirePatientAccess(requestedPatientId, req, res)) return;

    const stmt = db.prepare(`
        INSERT INTO appointments (patient_id, doctor_name, type, date, location, isVirtual, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `);
    
    stmt.run(requestedPatientId, doctor_name, type, date, location, isVirtual ? 1 : 0, function(err) {
        if (err) {
            console.error('Error creating appt:', err);
            return res.status(500).json({ error: 'DB Error creating appointment' });
        }
        res.json({ success: true, id: this.lastID, status: 'Pending' });
    });
    stmt.finalize();
});

// PUT /api/appointments/:id - confirm or reschedule
router.put('/appointments/:id', requireRole('doctor'), (req, res) => {
    const { id } = req.params;
    const { status, date, location, isVirtual } = req.body;
    
    // Build dynamic update
    let updates = [];
    let params = [];
    
    if (status) { updates.push('status = ?'); params.push(status); }
    if (date) { updates.push('date = ?'); params.push(date); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (isVirtual !== undefined) { updates.push('isVirtual = ?'); params.push(isVirtual ? 1 : 0); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    
    params.push(id);
    const query = `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`;
    
    db.run(query, params, function(err) {
        if (err) {
            console.error('Error updating appt:', err);
            return res.status(500).json({ error: 'DB Error updating appointment' });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// ==========================================
// CHAT API
// ==========================================

// GET /api/messages/:patient_id - Fetch chat history
router.get('/messages/:patient_id', (req, res) => {
    const { patient_id } = req.params;
    if (!requirePatientAccess(patient_id, req, res)) return;
    
    db.all(`SELECT * FROM messages WHERE patient_id = ? ORDER BY timestamp ASC`, [patient_id], (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err);
            return res.status(500).json({ error: 'DB Error fetching messages' });
        }
        res.json({ messages: rows });
    });
});

// GET /api/doctors - Fetch all doctors dynamically
router.get('/doctors', (req, res) => {
    db.all(`SELECT id as doctorId, username as name FROM users WHERE role = 'doctor'`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching doctors:', err);
            return res.status(500).json({ error: 'DB Error fetching doctors' });
        }
        res.json({ doctors: rows });
    });
});

// POST /api/ai/chat - AI Assistant endpoint
router.post('/ai/chat', (req, res) => {
    const { message } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'Message must be a non-empty string' });
    }

    let reply = "I am the AI Medical Assistant. I received your message. If this is an emergency, please press the 🚨 Emergency button to alert all doctors immediately.";
    
    const lowerMessage = message.trim();
    if (/\b(?:hello|hi)\b/i.test(lowerMessage)) {
        reply = "Hello! I am your AI assistant. I'm here to answer basic questions or connect you with a doctor. How can I help you today?";
    } else if (/\b(?:pain|hurt)\b/i.test(lowerMessage)) {
        reply = "I'm sorry to hear you're in pain. I can note this in your chart. Would you like to switch to 'Doctor Mode' and select a doctor to speak with directly? If it's unbearable, please use the Emergency button.";
    } else if (/\b(?:fever|hot)\b/i.test(lowerMessage)) {
        reply = "A fever could indicate an infection. Please ensure you stay hydrated. You might want to connect to your assigned doctor for a proper assessment.";
    }
    
    // Process response delay
    setTimeout(() => {
        res.json({ reply });
    }, 1000);
});

// POST /api/upload - Handle file attachments
router.post('/upload', handleUpload, (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No valid image or PDF file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl, fileType: req.file.mimetype });
});

module.exports = router;
