const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api/ingest';
const PATIENTS = [1, 2]; // IDs from seed

console.log("Starting Medical Device Simulation (Ctrl+C to stop)...");

const requestConfig = {
    headers: { 'x-device-key': process.env.DEVICE_API_KEY }
};

function generateVital(patientId) {
    const time = Date.now();
    // Simulate Heart Rate: 70 + sine wave + noise
    let hr = 70 + 10 * Math.sin(time / 5000) + Math.random() * 5;
    
    // Simulate SpO2: 98 - random small drops
    let spo2 = 98 - Math.random() * 2;

    const vitals = [
        {
            patient_id: patientId,
            device_id: `DEV-HR-0${patientId}`,
            vital_type: 'heart_rate',
            value: parseFloat(hr.toFixed(1)),
            unit: 'bpm',
            timestamp: new Date().toISOString()
        },
        {
            patient_id: patientId,
            device_id: `DEV-PO-0${patientId}`,
            vital_type: 'spo2',
            value: parseFloat(spo2.toFixed(1)),
            unit: '%',
            timestamp: new Date().toISOString()
        }
    ];
    return vitals;
}

async function sendVitals() {
    for (const pid of PATIENTS) {
        const vitals = generateVital(pid);
        for (const v of vitals) {
            try {
                // Occasional Critical Event for Patient 2 (Jane)
                // 5% chance of seizure event simulation
                if (pid === 2 && Math.random() > 0.95) {
                    v.event_probability = 0.92; // High seizure probability
                    console.log(`[SIM] Triggering SEIZURE event for P${pid}`);
                }
                
                // Occasional Tachycardia for Patient 1 (John)
                if (pid === 1 && Math.random() > 0.95) {
                    v.value = 150; // High HR
                    console.log(`[SIM] Triggering TACHYCARDIA for P${pid}`);
                }

                await axios.post(API_URL, v, requestConfig);
                // process.stdout.write('.');
            } catch (err) {
                console.error(`Error sending data for P${pid}:`, err.message);
            }
        }
    }
}

// Run every 2 seconds
setInterval(sendVitals, 2000);
