const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const db = require('./db');
const session = require('express-session');
const passport = require('./config/passport');
const { requireAuth } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = new Server(server, {
    cors: {
        origin: clientOrigin,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

app.use(cors({
    origin: clientOrigin,
    credentials: true
}));
app.use(express.json());

if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set.');
}

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true
    }
});

app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());
io.engine.use(passport.initialize());
io.engine.use(passport.session());

io.use((socket, next) => {
    if (!socket.request.user) {
        return next(new Error('Unauthorized'));
    }
    if (socket.request.user.role === 'patient' && !socket.request.user.patient_id) {
        return next(new Error('Patient record not found'));
    }
    next();
});

// Routes
app.use('/api', require('./routes/api'));

// Google Auth start
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Callback
app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: `${clientOrigin}/login?error=true` }),
    (req, res) => {
        res.redirect(`${clientOrigin}/`);
    }
);

// Get current user session
app.get('/api/auth/me', (req, res) => {
    if (req.user) {
        const { password_hash, ...safeUser } = req.user;
        res.json({ success: true, user: safeUser });
    } else {
        res.status(401).json({ success: false, message: "Not authenticated" });
    }
});

app.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy((sessionErr) => {
            if (sessionErr) return next(sessionErr);
            res.clearCookie('connect.sid');
            res.json({ success: true });
        });
    });
});

app.get('/uploads/:filename', requireAuth, (req, res, next) => {
    const { filename } = req.params;
    if (!/^[0-9]+-[0-9]+\.(?:jpg|png|gif|webp|pdf)$/.test(filename)) {
        return res.status(404).json({ error: 'File not found' });
    }

    db.get(
        'SELECT patient_id FROM messages WHERE attachment_url LIKE ? LIMIT 1',
        [`%/uploads/${filename}`],
        (err, message) => {
            if (err) return next(err);
            if (!message) return res.status(404).json({ error: 'File not found' });
            if (req.user.role !== 'doctor' &&
                !(req.user.role === 'patient' && Number(req.user.patient_id) === Number(message.patient_id))) {
                return res.status(403).json({ error: 'Forbidden' });
            }

            const filePath = path.join(__dirname, '../uploads', filename);
            res.set('X-Content-Type-Options', 'nosniff');
            res.set('Content-Disposition', filename.endsWith('.pdf') ? 'attachment' : 'inline');
            res.sendFile(filePath, (sendErr) => {
                if (sendErr && !res.headersSent) next(sendErr);
            });
        }
    );
});

const PORT = process.env.PORT || 5000;

io.on('connection', (socket) => {
    const user = socket.request.user;
    if (user.role === 'doctor') {
        socket.join('doctors');
    } else if (user.role === 'patient') {
        socket.join(`patient_${user.patient_id}`);
    }

    // Join a specific patient's chat room
    socket.on('join_chat', (patient_id) => {
        if (user.role !== 'doctor' &&
            !(user.role === 'patient' && Number(user.patient_id) === Number(patient_id))) {
            socket.emit('access_denied');
            return;
        }
        socket.join(`chat_${patient_id}`);
    });

    // Handle sending a message
    socket.on('send_message', (data) => {
        const { patient_id, content, attachment_url, attachment_type } = data || {};
        if (!Number.isInteger(patient_id) ||
            (user.role !== 'doctor' &&
                !(user.role === 'patient' && Number(user.patient_id) === patient_id)) ||
            typeof content !== 'string' || (!content.trim() && !attachment_url)) {
            socket.emit('access_denied');
            return;
        }

        const sender_role = user.role;
        const sender_id = String(user.id);
        const timestamp = new Date().toISOString();
        db.run(
            `INSERT INTO messages (patient_id, sender_role, sender_id, content, timestamp, attachment_url, attachment_type)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [patient_id, sender_role, sender_id, content, timestamp, attachment_url, attachment_type],
            function(err) {
            if (err) {
                console.error('Error saving message to DB:', err);
                return;
            }

            const newMessage = {
                id: this.lastID,
                patient_id,
                sender_role,
                sender_id,
                content,
                timestamp,
                attachment_url,
                attachment_type
            };

            io.to(`chat_${patient_id}`).emit('receive_message', newMessage);
        });
    });

    // Handle emergency alert
    socket.on('emergency', (data) => {
        const patientId = data && data.patientId;
        if (user.role !== 'doctor' &&
            !(user.role === 'patient' && Number(user.patient_id) === Number(patientId))) {
            socket.emit('access_denied');
            return;
        }
        io.to('doctors').emit('emergency_alert', { patientId, timestamp: new Date().toISOString() });
    });
});

// Make io accessible to routes
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
