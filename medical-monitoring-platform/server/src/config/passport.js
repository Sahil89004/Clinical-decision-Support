const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('../db');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const displayName = profile.displayName;

        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
          if (err) return done(err);

          if (user) {
            return done(null, user);
          } else {
             // Create a new patient
             db.run('INSERT INTO patients (name) VALUES (?)', [displayName], function(err) {
                 if (err) return done(err);
                 
                 const patientId = this.lastID;
                 
                 // Insert into users
                 db.run('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)', 
                 [displayName, email, 'google_oauth_no_pass', 'patient'], function(err) {
                     if (err) return done(err);
                     
                     const newUser = {
                         id: this.lastID,
                         username: displayName,
                         email: email,
                         role: 'patient',
                         patient_id: patientId
                     };
                     return done(null, newUser);
                 });
             });
          }
        });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false);
      
      if (user.role === 'patient') {
          // fetch patient_id
          db.get('SELECT id FROM patients WHERE name = ? OR primary_caregiver_phone = ?', [user.username, user.phone], (err, patient) => {
             if (patient) user.patient_id = patient.id;
             done(null, user);
          });
      } else {
          done(null, user);
      }
  });
});

module.exports = passport;
