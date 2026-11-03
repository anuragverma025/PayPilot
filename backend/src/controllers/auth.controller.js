import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';

/**
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const validated = registerSchema.parse(req.body);
    const result = await AuthService.register(validated);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: result
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors?.[0]?.message || 'Invalid input data.',
          details: err.errors
        }
      });
    }
    if (err.code === 'EMAIL_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const validated = loginSchema.parse(req.body);
    const result = await AuthService.login(validated);

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      data: result
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors?.[0]?.message || 'Invalid email or password.',
          details: err.errors
        }
      });
    }
    if (err.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: err.message
        }
      });
    }
    next(err);
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req, res, next) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated.'
        }
      });
    }

    const user = await AuthService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User profile not found.'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req, res) {
  // Stateless token logout: client clears token from storage
  return res.status(200).json({
    success: true,
    message: 'Signed out successfully.'
  });
}

