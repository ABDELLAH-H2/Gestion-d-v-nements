const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('./database');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
      // Check if user exists with this google_id
      const existingUser = await pool.query(
        'SELECT * FROM users WHERE google_id = $1',
        [profile.id]
      );

      if (existingUser.rows.length > 0) {
        return cb(null, existingUser.rows[0]);
      }

      // Check if user exists with the same email
      const existingEmail = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [profile.emails[0].value]
      );

      if (existingEmail.rows.length > 0) {
        // Link account? Or just error? For now, let's update with google_id
        const user = existingEmail.rows[0];
        await pool.query(
          'UPDATE users SET google_id = $1 WHERE id = $2',
          [profile.id, user.id]
        );
        return cb(null, { ...user, google_id: profile.id });
      }

      // Create new user
      const newUser = await pool.query(
        'INSERT INTO users (username, email, google_id, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
        [
          profile.displayName,
          profile.emails[0].value,
          profile.id,
          profile.photos[0]?.value
        ]
      );

      return cb(null, newUser.rows[0]);

    } catch (err) {
      return cb(err);
    }
  }
));

module.exports = passport;
