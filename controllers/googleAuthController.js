import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { generateToken } from './authController.js';

export const googleAuth = async (req, res, next) => {
  try {
    const { googleId, email, firstName, lastName, avatar } = req.body;

    // Check if user exists with this googleId
    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if email already exists (for users who might have signed up normally first)
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        // Merge accounts if email exists
        existingUser.googleId = googleId;
        existingUser.provider = 'google';
        existingUser.isVerified = true; // Google users are automatically verified
        if (avatar) existingUser.avatar = avatar;
        user = await existingUser.save();
      } else {
        // Create new user
        user = await User.create({
          googleId,
          email,
          firstName,
          lastName,
          avatar: avatar || 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1747893719/default_avatar_xpw8jv.jpg',
          provider: 'google',
          isVerified: true, // Google users are automatically verified
          password: 'google-auth-no-password' // Dummy password that won't be used
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
    next(error);
  }
};