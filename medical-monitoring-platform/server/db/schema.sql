CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('doctor', 'admin', 'patient')) NOT NULL,
    phone TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT DEFAULT 'Not Specified',
    blood_group TEXT DEFAULT 'Unknown',
    height TEXT DEFAULT 'Unknown',
    weight TEXT DEFAULT 'Unknown',
    condition TEXT,
    primary_caregiver_phone TEXT,
    is_active BOOLEAN DEFAULT 1
);
CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    patient_id INTEGER,
    status TEXT DEFAULT 'disconnected',
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
);
CREATE TABLE IF NOT EXISTS vitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    device_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    vital_type TEXT NOT NULL,
    value REAL,
    unit TEXT,
    raw_data JSON,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
);
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    severity TEXT CHECK(severity IN ('low', 'medium', 'critical')) NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_acknowledged BOOLEAN DEFAULT 0,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
);
CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_name TEXT NOT NULL,
    type TEXT NOT NULL,
    date DATETIME NOT NULL,
    location TEXT,
    isVirtual BOOLEAN DEFAULT 0,
    status TEXT CHECK(
        status IN (
            'Pending',
            'Confirmed',
            'Rescheduled',
            'Cancelled'
        )
    ) DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
);
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    sender_role TEXT CHECK(sender_role IN ('doctor', 'patient')) NOT NULL,
    sender_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    attachment_url TEXT,
    attachment_type TEXT,
    FOREIGN KEY(patient_id) REFERENCES patients(id)
);