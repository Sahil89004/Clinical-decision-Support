const sqlite3 = require('sqlite3').verbose();
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
        if (row && row.count === 0) {
            console.log("Seeding data...");
            db.run(`INSERT INTO patients (name, age, gender, blood_group, height, weight, condition, primary_caregiver_phone) VALUES 
                ('John Doe', 45, 'Male', 'O+', '5 ft 10 in', '185 lbs', 'Hypertension', '+1234567890'),
                ('Jane Smith', 30, 'Female', 'A-', '5 ft 4 in', '130 lbs', 'Epilepsy', '+1987654321')
            `);
            db.run(`INSERT INTO users (username, email, password_hash, role, phone) VALUES 
                ('doctor', 'doctor@medical.org', 'hash123', 'doctor', '+1112223333'),
                ('DOC321', 'doc321@medical.org', 'Sahilkharb@8', 'doctor', '+19998887777'),
                ('John Doe', 'john@patient.org', 'password123', 'patient', '+1234567890'),
                ('Jane Smith', 'jane@patient.org', 'password123', 'patient', '+1987654321')
            `);
        }
    });
}

module.exports = db;
