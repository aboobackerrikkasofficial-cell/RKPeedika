import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } from '../utils/appError.js';
import { otpService } from '../services/otp/otp.service.js';

// Helper to parse User-Agent
function parseUserAgent(ua) {
  let browser = 'Unknown Browser';
  let device = 'Unknown Device';

  if (!ua) return { browser, device };

  if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
  else if (ua.includes('Chrome')) browser = 'Google Chrome';
  else if (ua.includes('Safari')) browser = 'Apple Safari';
  else if (ua.includes('Edge')) browser = 'Microsoft Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  if (ua.includes('iPhone')) device = 'iPhone';
  else if (ua.includes('iPad')) device = 'iPad';
  else if (ua.includes('Android')) device = 'Android Device';
  else if (ua.includes('Windows')) device = 'Windows PC';
  else if (ua.includes('Macintosh')) device = 'Macintosh';
  else if (ua.includes('Linux')) device = 'Linux PC';

  return { browser, device };
}

// Deprecated endpoint but kept as stub/redirect
export const register = async (req, res, next) => {
  return next(new BadRequestError("Traditional email registration is disabled. Please log in using your Mobile Number OTP."));
};

// Traditional password login for administration portal
export const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new BadRequestError("Email and password/secret key are required."));
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      return next(new NotFoundError("Invalid credentials. Please verify your email and password."));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(new BadRequestError("Invalid credentials. Please verify your email and password."));
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refreshsecretkey',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: `Bearer ${token}`,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send OTP Code to Mobile Number
 */
export const sendOtpCode = async (req, res, next) => {
  const { phone } = req.body;

  if (!phone) {
    return next(new BadRequestError("Mobile number is required."));
  }

  // Clean phone input (strip country code prefix if sent)
  let cleanedPhone = phone.trim().replace(/[^0-9]/g, '');
  if (cleanedPhone.length > 10 && cleanedPhone.startsWith('91')) {
    cleanedPhone = cleanedPhone.substring(2);
  }

  if (cleanedPhone.length !== 10) {
    return next(new BadRequestError("Please enter a valid 10-digit mobile number."));
  }

  try {
    // 1. Rate limit: Max 3 OTP requests per 15 minutes
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const otpCount = await prisma.otpCode.count({
      where: {
        phone: cleanedPhone,
        createdAt: { gte: fifteenMinsAgo }
      }
    });

    if (otpCount >= 3) {
      return next(new BadRequestError("Rate limit exceeded. Maximum 3 OTP requests per 15 minutes."));
    }

    // 2. Lockout check: 5 failed verification attempts blocks number for 15 minutes
    const latestOtp = await prisma.otpCode.findFirst({
      where: { phone: cleanedPhone },
      orderBy: { createdAt: 'desc' }
    });

    if (latestOtp && latestOtp.attempts >= 5) {
      const blockExpiry = new Date(latestOtp.createdAt.getTime() + 15 * 60 * 1000);
      if (blockExpiry > new Date()) {
        const waitTime = Math.ceil((blockExpiry.getTime() - Date.now()) / 1000 / 60);
        return next(new BadRequestError(`Too many incorrect OTP attempts. This number is temporarily blocked. Please try again in ${waitTime} minutes.`));
      }
    }

    // 3. Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(otp, salt);

    // Get client metadata
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    const ua = req.headers['user-agent'] || '';
    const { browser, device } = parseUserAgent(ua);

    // Save OTP to database (hashed and masked plain OTP for development console logs)
    await prisma.otpCode.create({
      data: {
        phone: cleanedPhone,
        otp: process.env.NODE_ENV === 'development' ? otp : '******',
        hashed,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
        ip,
        device,
        browser
      }
    });

    // 4. Send OTP via the active provider
    await otpService.sendOTP(cleanedPhone, otp);

    const responseData = {
      success: true,
      message: "OTP sent successfully."
    };

    // Return the plain OTP in response body ONLY in development mode
    if (process.env.NODE_ENV === 'development') {
      responseData.developmentOtp = otp;
    }

    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP Code and Login/Register User
 */
export const verifyOtpCode = async (req, res, next) => {
  const { phone, code, rememberMe } = req.body;

  if (!phone || !code) {
    return next(new BadRequestError("Mobile number and OTP code are required."));
  }

  let cleanedPhone = phone.trim().replace(/[^0-9]/g, '');
  if (cleanedPhone.length > 10 && cleanedPhone.startsWith('91')) {
    cleanedPhone = cleanedPhone.substring(2);
  }

  try {
    // 1. Lockout check
    const latestOtp = await prisma.otpCode.findFirst({
      where: { phone: cleanedPhone },
      orderBy: { createdAt: 'desc' }
    });

    if (latestOtp && latestOtp.attempts >= 5) {
      const blockExpiry = new Date(latestOtp.createdAt.getTime() + 15 * 60 * 1000);
      if (blockExpiry > new Date()) {
        const waitTime = Math.ceil((blockExpiry.getTime() - Date.now()) / 1000 / 60);
        return next(new BadRequestError(`This number is temporarily blocked due to incorrect attempts. Try again in ${waitTime} minutes.`));
      }
    }

    // 2. Verify OTP
    const providerName = (process.env.OTP_PROVIDER || 'development').toLowerCase();
    let isVerified = false;

    if (providerName === 'firebase') {
      isVerified = await otpService.verifyOTP(cleanedPhone, code);
      if (!isVerified) {
        return next(new BadRequestError("Invalid Firebase verification token."));
      }
    } else {
      const activeOtp = await prisma.otpCode.findFirst({
        where: { phone: cleanedPhone, verified: false, expiresAt: { gte: new Date() } },
        orderBy: { createdAt: 'desc' }
      });

      if (!activeOtp) {
        return next(new BadRequestError("OTP has expired or is invalid. Please request a new one."));
      }

      isVerified = await bcrypt.compare(code, activeOtp.hashed);

      if (!isVerified) {
        // Increment attempts on incorrect OTP
        const newAttempts = activeOtp.attempts + 1;
        await prisma.otpCode.update({
          where: { id: activeOtp.id },
          data: { attempts: newAttempts }
        });

        if (newAttempts >= 5) {
          return next(new BadRequestError("Too many incorrect attempts. This phone number has been blocked for 15 minutes."));
        } else {
          return next(new BadRequestError(`Incorrect OTP code. Attempt ${newAttempts} of 5.`));
        }
      }

      // Mark OTP as verified
      await prisma.otpCode.update({
        where: { id: activeOtp.id },
        data: { verified: true }
      });
    }

    // 3. Retrieve or Create User
    let user = await prisma.user.findUnique({
      where: { phone: cleanedPhone }
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      // Auto register user
      user = await prisma.user.create({
        data: {
          phone: cleanedPhone,
          name: 'New User',
          role: 'customer',
          status: 'active'
        }
      });
    }

    if (user.status === 'banned') {
      return next(new ForbiddenError("Forbidden: Your account has been suspended by an administrator."));
    }

    // 4. Reset lockout counter on success
    if (latestOtp && latestOtp.attempts > 0) {
      await prisma.otpCode.updateMany({
        where: { phone: cleanedPhone },
        data: { attempts: 0 }
      });
    }

    // 5. Generate Session Tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '15m' }
    );

    const expiryDays = rememberMe ? 30 : 1;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, phone: user.phone, role: user.role },
      process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      { expiresIn: `${expiryDays}d` }
    );

    // Save refresh token record
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    // Save login audit logs
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
    const ua = req.headers['user-agent'] || '';
    const { browser, device } = parseUserAgent(ua);

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        device,
        browser
      }
    });

    // Legacy UserSession tracking compatibility
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: ua || 'Unknown Device',
        ipAddress: ip,
        status: 'active'
      }
    });

    res.json({
      success: true,
      token: `Bearer ${accessToken}`,
      refreshToken,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        gender: user.gender,
        dob: user.dob ? user.dob.toISOString().split('T')[0] : null,
        profileImage: user.profileImage,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Rotate Access & Refresh Tokens using rotated strategy
 */
export const refresh = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new BadRequestError("Refresh token is required."));
  }

  try {
    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret', async (err, decoded) => {
      if (err) {
        return next(new ForbiddenError("Invalid or expired refresh token. Please login again."));
      }

      // Check if session is active in database
      const dbToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!dbToken || dbToken.expiresAt < new Date()) {
        if (dbToken) {
          await prisma.refreshToken.delete({ where: { id: dbToken.id } }).catch(() => {});
        }
        return next(new ForbiddenError("Your session has expired or has been revoked. Please sign in again."));
      }

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || user.status === 'banned') {
        return next(new ForbiddenError("Your account is disabled or no longer exists."));
      }

      // Generate new access token
      const accessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, phone: decoded.phone, role: decoded.role },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '15m' }
      );

      // Rotate refresh token
      const nextExpiresAt = dbToken.expiresAt;
      const daysLeft = Math.max(1, Math.ceil((nextExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

      const nextRefreshToken = jwt.sign(
        { id: decoded.id, email: decoded.email, phone: decoded.phone, role: decoded.role },
        process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        { expiresIn: `${daysLeft}d` }
      );

      // Delete old and store new rotated token
      await prisma.refreshToken.delete({ where: { id: dbToken.id } }).catch(() => {});
      await prisma.refreshToken.create({
        data: {
          token: nextRefreshToken,
          userId: decoded.id,
          expiresAt: nextExpiresAt
        }
      });

      // Legacy UserSession rotation sync
      const session = await prisma.userSession.findFirst({
        where: { refreshToken, userId: decoded.id }
      });
      if (session) {
        await prisma.userSession.update({
          where: { id: session.id },
          data: {
            refreshToken: nextRefreshToken,
            lastActivity: new Date(),
            lastLogin: new Date()
          }
        });
      }

      res.json({
        success: true,
        token: `Bearer ${accessToken}`,
        refreshToken: nextRefreshToken
      });
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Invalidate refresh tokens and clear sessions
 */
export const logout = async (req, res, next) => {
  const { refreshToken } = req.body;

  try {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken }
      });
      await prisma.userSession.updateMany({
        where: { refreshToken },
        data: {
          status: 'revoked',
          logoutTime: new Date()
        }
      });
    } else if (req.user) {
      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.id }
      });
      await prisma.userSession.updateMany({
        where: { userId: req.user.id, status: 'active' },
        data: {
          status: 'revoked',
          logoutTime: new Date()
        }
      });
    }

    res.json({
      success: true,
      message: "Session logged out and invalidated successfully."
    });
  } catch (error) {
    next(error);
  }
};

// Session Management API Controllers (kept for dashboard list)
export const getSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { userId: req.user.id },
      orderBy: { lastActivity: 'desc' }
    });

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req, res, next) => {
  const { id } = req.params;

  try {
    const session = await prisma.userSession.findUnique({ where: { id } });
    if (!session || session.userId !== req.user.id) {
      return next(new NotFoundError("Session not found or unauthorized."));
    }

    await prisma.userSession.update({
      where: { id },
      data: {
        status: 'revoked',
        logoutTime: new Date()
      }
    });

    // Revoke corresponding token in RefreshToken
    await prisma.refreshToken.deleteMany({
      where: { token: session.refreshToken }
    });

    res.json({
      success: true,
      message: "Session successfully revoked."
    });
  } catch (error) {
    next(error);
  }
};

export const revokeAllSessions = async (req, res, next) => {
  try {
    await prisma.userSession.updateMany({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      data: {
        status: 'revoked',
        logoutTime: new Date()
      }
    });

    await prisma.refreshToken.deleteMany({
      where: { userId: req.user.id }
    });

    res.json({
      success: true,
      message: "All sessions successfully revoked."
    });
  } catch (error) {
    next(error);
  }
};

export const guestLogin = async (req, res, next) => {
  try {
    const guestPhone = '9999999999';
    let user = await prisma.user.findUnique({
      where: { phone: guestPhone }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone: guestPhone,
          name: 'Guest Customer',
          role: 'customer',
          status: 'active'
        }
      });
    }

    // Generate JWT tokens
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    const refreshTokenVal = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenVal,
        userId: user.id,
        expiresAt: refreshExpiry
      }
    });

    // Write login history
    const uaInfo = parseUserAgent(req.headers['user-agent']);
    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        device: uaInfo.device,
        browser: uaInfo.browser
      }
    });

    return res.status(200).json({
      success: true,
      token,
      refreshToken: refreshTokenVal,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const simpleLogin = async (req, res, next) => {
  const { phone, name, rememberMe } = req.body;

  if (!phone) {
    return next(new BadRequestError("Mobile number is required."));
  }
  if (!name || !name.trim()) {
    return next(new BadRequestError("Name is required."));
  }

  let cleanedPhone = phone.trim().replace(/[^0-9]/g, '');
  if (cleanedPhone.length > 10 && cleanedPhone.startsWith('91')) {
    cleanedPhone = cleanedPhone.substring(2);
  }

  // Free regex validation for Indian mobile numbers
  const phoneRegex = /^[6-9]\d{9}$/;
  if (cleanedPhone.length !== 10 || !phoneRegex.test(cleanedPhone)) {
    return next(new BadRequestError("Please enter a valid 10-digit Indian mobile number (should start with 6, 7, 8, or 9)."));
  }

  try {
    // Check if user is banned
    let user = await prisma.user.findUnique({
      where: { phone: cleanedPhone }
    });

    if (user && user.status === 'banned') {
      return next(new ForbiddenError("Your account has been disabled. Please contact support."));
    }

    if (user) {
      // Update name on login if changed
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: name.trim() }
      });
    } else {
      // Create new customer user
      user = await prisma.user.create({
        data: {
          phone: cleanedPhone,
          name: name.trim(),
          role: 'customer',
          status: 'active'
        }
      });
    }

    // Generate JWT access token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    // Refresh token
    const refreshTokenVal = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const refreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenVal,
        userId: user.id,
        expiresAt: refreshExpiry
      }
    });

    // Write login history
    const uaInfo = parseUserAgent(req.headers['user-agent']);
    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    
    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        device: uaInfo.device,
        browser: uaInfo.browser
      }
    });

    // Support legacy session stub
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenVal,
        loginTime: new Date(),
        lastActivity: new Date(),
        lastLogin: new Date(),
        deviceInfo: `${uaInfo.browser} on ${uaInfo.device}`,
        ipAddress: ip,
        status: 'active'
      }
    });

    return res.status(200).json({
      success: true,
      token,
      refreshToken: refreshTokenVal,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};
