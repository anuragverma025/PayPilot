import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword, generateAuthToken } from '../utils/auth.util.js';

// In-memory user store for testing or offline environments
const memoryUsers = new Map();

export class AuthService {
  /**
   * Check whether MongoDB is currently connected
   */
  static isMongoConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Register a new user
   */
  static async register({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Check existing in MongoDB
    if (this.isMongoConnected()) {
      try {
        const existing = await User.findOne({ email: normalizedEmail }).lean();
        if (existing) {
          const error = new Error('An account with this email address already exists.');
          error.code = 'EMAIL_ALREADY_EXISTS';
          error.status = 409;
          throw error;
        }

        const passwordHash = hashPassword(password);
        const user = await User.create({
          name: name.trim(),
          email: normalizedEmail,
          passwordHash
        });

        const token = generateAuthToken(user);
        return {
          user: {
            id: String(user._id),
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
          },
          token
        };
      } catch (err) {
        if (err.code === 'EMAIL_ALREADY_EXISTS') throw err;
        console.warn('MongoDB user registration failed, falling back to in-memory store:', err.message);
      }
    }

    // Fallback: In-memory store
    for (const u of memoryUsers.values()) {
      if (u.email === normalizedEmail) {
        const error = new Error('An account with this email address already exists.');
        error.code = 'EMAIL_ALREADY_EXISTS';
        error.status = 409;
        throw error;
      }
    }

    const passwordHash = hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userRecord = {
      _id: userId,
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    memoryUsers.set(userId, userRecord);
    memoryUsers.set(normalizedEmail, userRecord);

    const token = generateAuthToken(userRecord);
    return {
      user: {
        id: userId,
        name: userRecord.name,
        email: userRecord.email,
        createdAt: userRecord.createdAt
      },
      token
    };
  }

  /**
   * Authenticate user with email & password
   */
  static async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();
    let user = null;

    if (this.isMongoConnected()) {
      try {
        user = await User.findOne({ email: normalizedEmail }).lean();
      } catch (err) {
        console.warn('MongoDB login lookup failed, checking in-memory store:', err.message);
      }
    }

    if (!user) {
      user = memoryUsers.get(normalizedEmail) || null;
    }

    if (!user) {
      const error = new Error('Invalid email or password.');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Invalid email or password.');
      error.code = 'INVALID_CREDENTIALS';
      error.status = 401;
      throw error;
    }

    const token = generateAuthToken(user);
    return {
      user: {
        id: String(user._id || user.id),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      token
    };
  }

  /**
   * Get user profile by ID
   */
  static async getUserById(userId) {
    if (!userId) return null;

    if (this.isMongoConnected()) {
      try {
        const user = await User.findById(userId).select('-passwordHash').lean();
        if (user) {
          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            createdAt: user.createdAt
          };
        }
      } catch (err) {
        console.warn('MongoDB user lookup failed:', err.message);
      }
    }

    const inMem = memoryUsers.get(userId);
    if (inMem) {
      return {
        id: String(inMem._id || inMem.id),
        name: inMem.name,
        email: inMem.email,
        createdAt: inMem.createdAt
      };
    }

    return null;
  }

  /**
   * Test helper: clear in-memory user registry
   */
  static clearMemoryUsers() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('clearMemoryUsers can only be called in test environment');
    }
    memoryUsers.clear();
  }
}

