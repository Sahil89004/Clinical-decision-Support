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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Allow frontend URL for credentials
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(session({
    secret: 'skhospitalsecret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Change to true if using HTTPS
}));

app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api', require('./routes/api'));

// Google Auth start
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Callback
app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: 'http://localhost:5173/login?error=true' }),
    (req, res) => {
        // Successful authentication
        res.redirect('http://localhost:5173/'); // Redirect to frontend dashboard
    }
);

// Get current user session
app.get('/api/auth/me', (req, res) => {
    if (req.user) {
        res.json({ success: true, user: req.user });
    } else {
        res.status(401).json({ success: false, message: "Not authenticated" });
    }
});

app.post('/api/auth/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.json({ success: true });
    });
});

const PORT = process.env.PORT || 5000;

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Join a specific patient's chat room
    socket.on('join_chat', (patient_id) => {
        socket.join(`chat_${patient_id}`);
        console.log(`Socket ${socket.id} joined chat room: chat_${patient_id}`);
    });

    // Handle sending a message
    socket.on('send_message', (data) => {
        const { patient_id, sender_role, sender_id, content, attachment_url, attachment_type } = data;
        const timestamp = new Date().toISOString();

        // 1. Save to DB
        const stmt = db.prepare(`INSERT INTO messages (patient_id, sender_role, sender_id, content, timestamp, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(patient_id, sender_role, sender_id, content, timestamp, attachment_url, attachment_type, function(err) {
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

            // 2. Broadcast to everyone in that room
            io.to(`chat_${patient_id}`).emit('receive_message', newMessage);
        });
        stmt.finalize();
    });

    // Handle emergency alert
    socket.on('emergency', (data) => {
        const { patientId } = data;
        console.log(`EMERGENCY triggered for patient: ${patientId}`);
        io.emit('emergency_alert', { patientId, timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Make io accessible to routes
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
