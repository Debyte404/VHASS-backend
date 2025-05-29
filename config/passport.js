import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/User.js';

// Google OAuth configuration
const googleConfig = {
  clientID: '8739533127-rvga58btf64j28njdjdq84r2kof2h4n4.apps.googleusercontent.com',
  clientSecret: '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',
  callbackURL: 'https://vhass-backend.onrender.com/api/auth/google/callback'
};

console.log('Google OAuth Configuration:', {
  clientID: googleConfig.clientID ? 'Set' : 'Not Set',
  clientSecret: googleConfig.clientSecret ? 'Set' : 'Not Set',
  callbackURL: googleConfig.callbackURL
});

passport.use(
  new GoogleStrategy(
    {
      clientID: googleConfig.clientID,
      clientSecret: googleConfig.clientSecret,
      callbackURL: googleConfig.callbackURL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google profile received:', {
          id: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName
        });

        // Check if user already exists
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          // Create new user if doesn't exist
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            password: Math.random().toString(36).slice(-8), // Random password
            avatar: profile.photos?.[0]?.value || '',
            role: 'user',
            isVerified: true, // Google accounts are pre-verified
            googleId: profile.id,
            isGoogleUser: true
          });
          console.log('New user created:', user.email);
        } else if (!user.googleId) {
          // Update existing user with Google ID if not already set
          user.googleId = profile.id;
          user.avatar = profile.photos?.[0]?.value || user.avatar;
          user.isGoogleUser = true;
          await user.save();
          console.log('Existing user updated with Google ID:', user.email);
        }

        return done(null, user);
      } catch (error) {
        console.error('Google Strategy Error:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport; 
