const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('./database');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.BACKEND_URL
    ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/auth/google/callback`
    : "/api/auth/google/callback"
},
  async function (accessToken, refreshToken, profile, cb) {
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
      let username = profile.displayName || profile.emails[0].value.split('@')[0];
      let user;
      let retries = 0;

      while (!user && retries < 5) {
        try {
          const newUser = await pool.query(
            'INSERT INTO users (username, email, google_id, avatar) VALUES ($1, $2, $3, $4) RETURNING *',
            [
              username,
              profile.emails[0].value,
              profile.id,
              profile.photos[0]?.value
            ]
          );
          user = newUser.rows[0];
        } catch (err) {
          // Unique violation (Postgres code 23505)
          if (err.code === '23505') {
            // If it's the email constraint, something is wrong (we checked email above)
            // But if it's username, we try again with a new name
            if (err.detail && err.detail.includes('email')) {
              throw err;
            }
            // Assume username conflict, generate new one
            username = `${(profile.displayName || profile.emails[0].value.split('@')[0]).replace(/\s+/g, '')}_${Math.floor(1000 + Math.random() * 9000)}`;
            retries++;
          } else {
            throw err;
          }
        }
      }

      if (!user) {
        throw new Error('Failed to create user after multiple retries');
      }

      return cb(null, user);

    } catch (err) {
      console.error('Google Auth Strategy Error:', err);
      return cb(err);
    }
  }
));

module.exports = passport;
