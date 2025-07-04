import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import dotenv from "dotenv";
import { generateToken } from './authController.js';

dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Verify the Google ID token with debugging
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    console.log('Google Payload:', payload); // Debug payload

    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: avatar } = payload;

    // Default role for new Google users (e.g., 'student')
    const defaultRole = 'student';

    // Check if user exists with this googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if email already exists (for users who might have signed up normally first)
      const existingUser = await User.findOne({ email }).select('+provider');
      
      if (existingUser) {
        // Merge accounts if email exists
        if (existingUser.provider === 'local') {
          existingUser.googleId = googleId;
          existingUser.provider = 'google';
          existingUser.isVerified = true;
          if (avatar) existingUser.avatar = avatar;
          existingUser.role = existingUser.role || defaultRole; // Ensure role is set
          user = await existingUser.save();
        } else {
          return res.status(400).json({
            success: false,
            message: 'Email already linked to another Google account',
          });
        }
      } else {
        // Create new user with avatar from Google or default
        user = await User.create({
          googleId,
          email,
          firstName,
          lastName,
          avatar: avatar || 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1747893719/default_avatar_xpw8jv.jpg',
          provider: 'google',
          isVerified: true,
          password: 'google-auth-no-password',
          role: defaultRole, // Set default role
        });
      }
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        token
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error.message, error.stack);
    next(error);
  }
};