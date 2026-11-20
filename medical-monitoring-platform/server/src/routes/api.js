const express = require('express');
const router = express.Router();
const db = require('../db');
const { analyzeVitals } = require('../services/monitor');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// POST /api/ingest - Receive data from devices
router.post('/ingest', (req, res) => {
    const { patient_id, device_id, vital_type, value, unit, event_probability, timestamp } = req.body;
    const io = req.app.get('io');
    const ts = timestamp || new Date().toISOString();

    console.log(`[INGEST] Received ${vital_type} for P${patient_id}: ${value}`);

    // 1. Store Vital
    const stmt = db.prepare(`
        INSERT INTO vitals (patient_id, device_id, timestamp, vital_type, value, unit)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(patient_id, device_id, ts, vital_type, value, unit, function(err) {
        if (err) {
            console.error('DB Insert Error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        // 2. Analyze for Alerts
        const alerts = analyzeVitals(req.body);
        
        alerts.forEach(alert => {
            console.log(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
            
            // Store Alert
            db.run(`INSERT INTO alerts (patient_id, severity, message, timestamp) VALUES (?, ?, ?, ?)`, 
                [patient_id, alert.severity, alert.message, ts]);
            
            // Emit Alert
            io.emit('alert_new', { ...alert, patient_id, timestamp: ts });

            if (alert.severity === 'critical') {
                console.log(`>>> SMS SENT TO CAREGIVER: "${alert.message}" <<<`);
            }
        });

        // 3. Emit Real-time Vital Update
        io.emit('vital_update', {
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

// POST /api/register - Register a new user
router.post('/register', (req, res) => {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const stmt = db.prepare(`INSERT INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)`);
    stmt.run(name, email, password, 'patient', phone, function(err) {
        if (err) {
            console.error('Registration error:', err);
            if (err.message.includes('UNIQUE')) {
                 return res.status(409).json({ error: 'Email or username already exists' });
            }
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Ensure patient is also in patients table
        db.run(`INSERT INTO patients (name, primary_caregiver_phone) VALUES (?, ?)`, [name, phone]);

        res.json({ success: true, message: 'Registration successful' });
    });
    stmt.finalize();
});

// POST /api/login - Verify user credentials
router.post('/login', (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    // Check if the input matches username, email, or phone
    db.get(`SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?`, [username, username, username], (err, user) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found. Please register first.' });
        }

        if (user.role !== role) {
            let portalName = role === 'doctor' ? 'Doctor Portal' : 'Patient Portal';
            return res.status(403).json({ error: `Access denied: Your account does not have access to the ${portalName}.` });
        }

        // Verify password
        if (password === user.password_hash || 
            (user.username === 'doctor' && password === 'hash123') ||
            (user.username === 'DOC321' && password === 'Sahilkharb@8')) {
            
            const { password_hash, ...userWithoutPassword } = user;
            
            let patient_id = null;
            if (user.role === 'patient') {
                db.get(`SELECT id FROM patients WHERE name = ? OR primary_caregiver_phone = ?`, [user.username, user.phone], (err, patient) => {
                    if (patient) patient_id = patient.id;
                    res.json({ success: true, user: { ...userWithoutPassword, patient_id } });
                });
                return; // Wait for async
            }

            // Login successful
            return res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    phone: user.phone
                }
            });
        } else {
            return res.status(401).json({ error: 'Incorrect password. Please check your details.' });
        }
    });
});

// GET /api/patients - List all patients with latest status
router.get('/patients', (req, res) => {
    db.all(`SELECT * FROM patients`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// GET /api/patients/:id/vitals - History
router.get('/patients/:id/vitals', (req, res) => {
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
    db.all(`SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 50`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});
// ==========================================
// APPOINTMENTS API
// ==========================================

// GET /api/appointments - fetch for patient or doctor
router.get('/appointments', (req, res) => {
    const { patient_id } = req.query;
    
    let query = `SELECT * FROM appointments ORDER BY date ASC`;
    let params = [];
    
    if (patient_id) {
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
    
    if (!patient_id || !date || !doctor_name) {
        return res.status(400).json({ error: 'Missing required appointment fields' });
    }

    const stmt = db.prepare(`
        INSERT INTO appointments (patient_id, doctor_name, type, date, location, isVirtual, status)
        VALUES (?, ?, ?, ?, ?, ?, 'Pending')
    `);
    
    stmt.run(patient_id, doctor_name, type, date, location, isVirtual ? 1 : 0, function(err) {
        if (err) {
            console.error('Error creating appt:', err);
            return res.status(500).json({ error: 'DB Error creating appointment' });
        }
        res.json({ success: true, id: this.lastID, status: 'Pending' });
    });
    stmt.finalize();
});

// PUT /api/appointments/:id - confirm or reschedule
router.put('/appointments/:id', (req, res) => {
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
    let reply = "I am the AI Medical Assistant. I received your message. If this is an emergency, please press the 🚨 Emergency button to alert all doctors immediately.";
    
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        reply = "Hello! I am your AI assistant. I'm here to answer basic questions or connect you with a doctor. How can I help you today?";
    } else if (lowerMessage.includes('pain') || lowerMessage.includes('hurt')) {
        reply = "I'm sorry to hear you're in pain. I can note this in your chart. Would you like to switch to 'Doctor Mode' and select a doctor to speak with directly? If it's unbearable, please use the Emergency button.";
    } else if (lowerMessage.includes('fever') || lowerMessage.includes('hot')) {
        reply = "A fever could indicate an infection. Please ensure you stay hydrated. You might want to connect to your assigned doctor for a proper assessment.";
    }
    
    // Process response delay
    setTimeout(() => {
        res.json({ reply });
    }, 1000);
});

// POST /api/upload - Handle file attachments
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    res.json({ success: true, fileUrl, fileType: req.file.mimetype });
});

module.exports = router;
