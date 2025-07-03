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

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID, // Must match the Client ID from Google Cloud Console
    });
    const payload = ticket.getPayload();

    const { sub: googleId, email, given_name: firstName, family_name: lastName, picture: avatar } = payload;

    // Check if user exists with this googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if email already exists (for users who might have signed up normally first)
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        // Merge accounts if email exists
        existingUser.googleId = googleId;
        existingUser.provider = 'google';
        existingUser.isVerified = true;
        if (avatar) existingUser.avatar = avatar; // Update avatar only if picture is provided
        user = await existingUser.save();
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
          password: 'google-auth-no-password'
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
    console.error('Google authentication error:', error);
    next(error);
  }
};