// Simple rule-based monitoring service
function analyzeVitals(data) {
    const alerts = [];
    const { vital_type, value, event_probability } = data;

    // Rule 1: High Event Probability (ML model trigger)
    if (event_probability && event_probability > 0.8) {
        alerts.push({
            severity: 'critical',
            message: `High confidence seizure event detected (${(event_probability * 100).toFixed(1)}%)`
        });
    }

    // Rule 2: Heart Rate Thresholds
    if (vital_type === 'heart_rate') {
        if (value > 140) {
            alerts.push({ severity: 'medium', message: `Tachycardia detected: ${value} bpm` });
        } else if (value < 40) {
            alerts.push({ severity: 'critical', message: `Bradycardia detected: ${value} bpm` });
        }
    }

    // Rule 3: SpO2 Hypoxia
    if (vital_type === 'spo2') {
        if (value < 90) {
            alerts.push({ severity: 'critical', message: `Low Oxygen Saturation: ${value}%` });
        }
    }

    return alerts;
}

module.exports = { analyzeVitals };
