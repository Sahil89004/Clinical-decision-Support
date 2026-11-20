function requireAuth(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }

    return res.status(401).json({ error: 'Authentication required' });
}

function requireRole(role) {
    return (req, res, next) => {
        if (req.user && req.user.role === role) {
            return next();
        }

        return res.status(403).json({ error: 'Forbidden' });
    };
}

function requirePatientAccess(patientId, req, res) {
    if (req.user.role === 'doctor') {
        return true;
    }

    if (req.user.role === 'patient' && Number(patientId) === Number(req.user.patient_id)) {
        return true;
    }

    res.status(403).json({ error: 'Forbidden' });
    return false;
}

module.exports = { requireAuth, requireRole, requirePatientAccess };
