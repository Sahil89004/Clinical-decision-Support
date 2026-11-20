const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../db/medical.db');
const schemaPath = path.resolve(__dirname, '../db/schema.sql');

// Ensure db directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema, (err) => {
        if (err) {
            console.error('Error initializing database schema:', err.message);
        } else {
            console.log('Database schema initialized.');
            // Migration: Add attachment columns if they don't exist
            db.run(`ALTER TABLE messages ADD COLUMN attachment_url TEXT`, (err) => {});
            db.run(`ALTER TABLE messages ADD COLUMN attachment_type TEXT`, (err) => {});
            seedData();
        }
    });
}

function seedData() {
    db.get("SELECT count(*) as count FROM patients", (err, row) => {
        if (err) {
            console.error('Error checking seed data:', err.message);
            return;
        }

        const seedUsers = () => {
            db.run("DELETE FROM users WHERE username = 'DOC321'");
            const doctorPassword = process.env.DEMO_DOCTOR_PASSWORD;
            const patientPassword = process.env.DEMO_PATIENT_PASSWORD;
            if (!doctorPassword || doctorPassword.length < 8 || !patientPassword || patientPassword.length < 8) {
                console.error('Set DEMO_DOCTOR_PASSWORD and DEMO_PATIENT_PASSWORD (at least 8 characters) to seed demo accounts.');
                return;
            }

            Promise.all([
                bcrypt.hash(doctorPassword, 10),
                bcrypt.hash(patientPassword, 10)
            ]).then(([doctorHash, patientHash]) => {
                db.run(
                    'INSERT OR IGNORE INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
                    ['doctor', 'doctor@medical.org', doctorHash, 'doctor', '+1112223333']
                );
                db.run(
                    'INSERT OR IGNORE INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
                    ['John Doe', 'john@patient.org', patientHash, 'patient', '+1234567890']
                );
                db.run(
                    'INSERT OR IGNORE INTO users (username, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
                    ['Jane Smith', 'jane@patient.org', patientHash, 'patient', '+1987654321']
                );
                db.run(
                    `UPDATE users SET password_hash = ?
                     WHERE username = 'doctor' AND password_hash NOT LIKE '$2%'`,
                    [doctorHash]
                );
                db.run(
                    `UPDATE users SET password_hash = ?
                     WHERE username IN ('John Doe', 'Jane Smith') AND password_hash NOT LIKE '$2%'`,
                    [patientHash]
                );
            }).catch(hashErr => {
                console.error('Error hashing demo passwords:', hashErr.message);
            });
        };

        if (row.count === 0) {
            console.log('Seeding data...');
            db.run(`INSERT INTO patients (name, age, gender, blood_group, height, weight, condition, primary_caregiver_phone) VALUES 
                ('John Doe', 45, 'Male', 'O+', '5 ft 10 in', '185 lbs', 'Hypertension', '+1234567890'),
                ('Jane Smith', 30, 'Female', 'A-', '5 ft 4 in', '130 lbs', 'Epilepsy', '+1987654321')
            `, (patientErr) => {
                if (patientErr) {
                    console.error('Error seeding patients:', patientErr.message);
                    return;
                }
                seedUsers();
            });
        } else {
            seedUsers();
        }
    });
}

module.exports = db;
