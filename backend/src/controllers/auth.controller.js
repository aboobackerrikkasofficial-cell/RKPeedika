import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
} from '../utils/appError.js';
import { otpService } from '../services/otp/otp.service.js';

// ============================================================
// HELPERS
// ============================================================

function parseUserAgent(ua) {
  let browser = 'Unknown Browser';
  let device = 'Unknown Device';

  if (!ua) {
    return { browser, device };
  }

  if (ua.includes('Firefox')) {
    browser = 'Mozilla Firefox';
  } else if (ua.includes('Chrome')) {
    browser = 'Google Chrome';
  } else if (ua.includes('Safari')) {
    browser = 'Apple Safari';
  } else if (ua.includes('Edge')) {
    browser = 'Microsoft Edge';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  }

  if (ua.includes('iPhone')) {
    device = 'iPhone';
  } else if (ua.includes('iPad')) {
    device = 'iPad';
  } else if (ua.includes('Android')) {
    device = 'Android Device';
  } else if (ua.includes('Windows')) {
    device = 'Windows PC';
  } else if (ua.includes('Macintosh')) {
    device = 'Macintosh';
  } else if (ua.includes('Linux')) {
    device = 'Linux PC';
  }

  return { browser, device };
}


// ============================================================
// CUSTOMER REGISTRATION
// ============================================================

export const register = async (req, res, next) => {
  return next(
    new BadRequestError(
      'Traditional email registration is disabled. Please use the free mobile login.'
    )
  );
};


// ============================================================
// ADMIN LOGIN
// ============================================================
// This is the important fixed function.
//
// Admin dashboard sends:
// {
//   email: "...",
//   password: "..."
// }
//
// We verify the password against the bcrypt hash stored
// in PostgreSQL.
// ============================================================

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return next(
        new BadRequestError('Email is required.')
      );
    }

    // Validate password
    if (!password || typeof password !== 'string') {
      return next(
        new BadRequestError('Password is required.')
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail
      }
    });

    if (!user) {
      return next(
        new UnauthorizedError(
          'Invalid credentials. Please verify your email and password.'
        )
      );
    }

    // --------------------------------------------------------
    // IMPORTANT FIX
    // --------------------------------------------------------
    //
    // bcrypt.compare(password, user.password)
    //
    // requires user.password to be a STRING.
    //
    // Your Render logs showed:
    //
    // Illegal arguments: string, object
    //
    // Therefore we explicitly check the stored value before
    // calling bcrypt.
    // --------------------------------------------------------

    if (
      typeof user.password !== 'string' ||
      user.password.trim().length === 0
    ) {
      console.error(
        '[AUTH] Invalid password hash in database.',
        {
          userId: user.id,
          email: user.email,
          passwordType: typeof user.password
        }
      );

      return next(
        new UnauthorizedError(
          'Admin password is not configured correctly. Please reset the admin password.'
        )
      );
    }

    // Compare entered password with bcrypt hash
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return next(
        new UnauthorizedError(
          'Invalid credentials. Please verify your email and password.'
        )
      );
    }

    // --------------------------------------------------------
    // SECURITY CHECK
    // --------------------------------------------------------

    if (user.status === 'banned') {
      return next(
        new ForbiddenError(
          'Your account has been suspended by an administrator.'
        )
      );
    }

    // --------------------------------------------------------
    // JWT SECRET CHECK
    // --------------------------------------------------------

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        '[AUTH] JWT_SECRET is missing from environment variables.'
      );

      return next(
        new Error(
          'Server authentication configuration is incomplete.'
        )
      );
    }

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET;

    if (!refreshSecret) {
      console.error(
        '[AUTH] JWT_REFRESH_SECRET is missing from environment variables.'
      );

      return next(
        new Error(
          'Server refresh authentication configuration is incomplete.'
        )
      );
    }

    // --------------------------------------------------------
    // CREATE ACCESS TOKEN
    // --------------------------------------------------------

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      {
        expiresIn: '1d'
      }
    );

    // --------------------------------------------------------
    // CREATE REFRESH TOKEN
    // --------------------------------------------------------

    const refreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      refreshSecret,
      {
        expiresIn: '7d'
      }
    );

    // --------------------------------------------------------
    // SAVE REFRESH TOKEN
    // --------------------------------------------------------

    try {
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(
            Date.now() +
            7 * 24 * 60 * 60 * 1000
          )
        }
      });
    } catch (refreshDbError) {
      console.error(
        '[AUTH] Could not save refresh token:',
        refreshDbError
      );

      return next(
        new Error(
          'Could not create login session. Please try again.'
        )
      );
    }

    // --------------------------------------------------------
    // SAVE LOGIN HISTORY
    // --------------------------------------------------------

    try {
      const ip =
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.socket.remoteAddress ||
        'Unknown IP';

      const ua =
        req.headers['user-agent'] || '';

      const {
        browser,
        device
      } = parseUserAgent(ua);

      await prisma.loginHistory.create({
        data: {
          userId: user.id,
          ip,
          device,
          browser
        }
      });
    } catch (historyError) {
      // Login should not fail only because audit logging failed.
      console.error(
        '[AUTH] Login history error:',
        historyError
      );
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({
      success: true,

      // Frontend expects Bearer token
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
    console.error(
      '[AUTH LOGIN ERROR]',
      error
    );

    next(error);
  }
};


// ============================================================
// SEND OTP
// ============================================================

export const sendOtpCode = async (
  req,
  res,
  next
) => {
  const { phone } = req.body;

  if (!phone) {
    return next(
      new BadRequestError(
        'Mobile number is required.'
      )
    );
  }

  let cleanedPhone = phone
    .trim()
    .replace(/[^0-9]/g, '');

  if (
    cleanedPhone.length > 10 &&
    cleanedPhone.startsWith('91')
  ) {
    cleanedPhone =
      cleanedPhone.substring(2);
  }

  if (cleanedPhone.length !== 10) {
    return next(
      new BadRequestError(
        'Please enter a valid 10-digit mobile number.'
      )
    );
  }

  try {
    // Maximum 3 OTP requests in 15 minutes
    const fifteenMinsAgo =
      new Date(
        Date.now() -
        15 * 60 * 1000
      );

    const otpCount =
      await prisma.otpCode.count({
        where: {
          phone: cleanedPhone,
          createdAt: {
            gte: fifteenMinsAgo
          }
        }
      });

    if (otpCount >= 3) {
      return next(
        new BadRequestError(
          'Rate limit exceeded. Maximum 3 OTP requests per 15 minutes.'
        )
      );
    }

    // Check latest OTP
    const latestOtp =
      await prisma.otpCode.findFirst({
        where: {
          phone: cleanedPhone
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

    if (
      latestOtp &&
      latestOtp.attempts >= 5
    ) {
      const blockExpiry =
        new Date(
          latestOtp.createdAt.getTime() +
          15 * 60 * 1000
        );

      if (blockExpiry > new Date()) {
        const waitTime =
          Math.ceil(
            (blockExpiry.getTime() -
              Date.now()) /
            1000 /
            60
          );

        return next(
          new BadRequestError(
            `Too many incorrect OTP attempts. This number is temporarily blocked. Please try again in ${waitTime} minutes.`
          )
        );
      }
    }

    // Generate OTP
    const otp =
      Math.floor(
        100000 +
        Math.random() * 900000
      ).toString();

    const salt =
      await bcrypt.genSalt(10);

    const hashed =
      await bcrypt.hash(
        otp,
        salt
      );

    const ip =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      'Unknown IP';

    const ua =
      req.headers['user-agent'] || '';

    const {
      browser,
      device
    } = parseUserAgent(ua);

    // Save OTP
    await prisma.otpCode.create({
      data: {
        phone: cleanedPhone,

        otp:
          process.env.NODE_ENV ===
            'development'
            ? otp
            : '******',

        hashed,

        expiresAt:
          new Date(
            Date.now() +
            5 * 60 * 1000
          ),

        ip,
        device,
        browser
      }
    });

    // Send through configured provider
    await otpService.sendOTP(
      cleanedPhone,
      otp
    );

    const responseData = {
      success: true,
      message:
        'OTP sent successfully.'
    };

    // Development only
    if (
      process.env.NODE_ENV ===
      'development'
    ) {
      responseData.developmentOtp =
        otp;
    }

    return res.json(
      responseData
    );

  } catch (error) {
    next(error);
  }
};


// ============================================================
// VERIFY OTP
// ============================================================

export const verifyOtpCode = async (
  req,
  res,
  next
) => {
  const {
    phone,
    code,
    rememberMe
  } = req.body;

  if (!phone || !code) {
    return next(
      new BadRequestError(
        'Mobile number and OTP code are required.'
      )
    );
  }

  let cleanedPhone = phone
    .trim()
    .replace(/[^0-9]/g, '');

  if (
    cleanedPhone.length > 10 &&
    cleanedPhone.startsWith('91')
  ) {
    cleanedPhone =
      cleanedPhone.substring(2);
  }

  try {
    // Latest OTP
    const latestOtp =
      await prisma.otpCode.findFirst({
        where: {
          phone: cleanedPhone
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

    if (
      latestOtp &&
      latestOtp.attempts >= 5
    ) {
      const blockExpiry =
        new Date(
          latestOtp.createdAt.getTime() +
          15 * 60 * 1000
        );

      if (blockExpiry > new Date()) {
        const waitTime =
          Math.ceil(
            (blockExpiry.getTime() -
              Date.now()) /
            1000 /
            60
          );

        return next(
          new BadRequestError(
            `This number is temporarily blocked due to incorrect attempts. Try again in ${waitTime} minutes.`
          )
        );
      }
    }

    // Provider
    const providerName =
      (
        process.env.OTP_PROVIDER ||
        'development'
      ).toLowerCase();

    let isVerified = false;

    // Firebase
    if (
      providerName ===
      'firebase'
    ) {
      isVerified =
        await otpService.verifyOTP(
          cleanedPhone,
          code
        );

      if (!isVerified) {
        return next(
          new BadRequestError(
            'Invalid Firebase verification token.'
          )
        );
      }
    }

    // Development OTP
    else {
      const activeOtp =
        await prisma.otpCode.findFirst({
          where: {
            phone: cleanedPhone,
            verified: false,
            expiresAt: {
              gte: new Date()
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

      if (!activeOtp) {
        return next(
          new BadRequestError(
            'OTP has expired or is invalid. Please request a new one.'
          )
        );
      }

      isVerified =
        await bcrypt.compare(
          String(code),
          String(activeOtp.hashed)
        );

      if (!isVerified) {
        const newAttempts =
          activeOtp.attempts + 1;

        await prisma.otpCode.update({
          where: {
            id: activeOtp.id
          },
          data: {
            attempts: newAttempts
          }
        });

        if (newAttempts >= 5) {
          return next(
            new BadRequestError(
              'Too many incorrect attempts. This phone number has been blocked for 15 minutes.'
            )
          );
        }

        return next(
          new BadRequestError(
            `Incorrect OTP code. Attempt ${newAttempts} of 5.`
          )
        );
      }

      await prisma.otpCode.update({
        where: {
          id: activeOtp.id
        },
        data: {
          verified: true
        }
      });
    }

    // ========================================================
    // GET / CREATE USER
    // ========================================================

    let user =
      await prisma.user.findUnique({
        where: {
          phone: cleanedPhone
        }
      });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;

      user =
        await prisma.user.create({
          data: {
            phone: cleanedPhone,
            name: 'New User',
            role: 'customer',
            status: 'active'
          }
        });
    }

    if (
      user.status ===
      'banned'
    ) {
      return next(
        new ForbiddenError(
          'Forbidden: Your account has been suspended by an administrator.'
        )
      );
    }

    // Reset OTP attempts
    await prisma.otpCode.updateMany({
      where: {
        phone: cleanedPhone
      },
      data: {
        attempts: 0
      }
    });

    // ========================================================
    // TOKENS
    // ========================================================

    const jwtSecret =
      process.env.JWT_SECRET ||
      'secret';

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      'refresh_secret';

    const accessToken =
      jwt.sign(
        {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        jwtSecret,
        {
          expiresIn: '15m'
        }
      );

    const expiryDays =
      rememberMe ? 30 : 1;

    const expiresAt =
      new Date(
        Date.now() +
        expiryDays *
        24 *
        60 *
        60 *
        1000
      );

    const refreshToken =
      jwt.sign(
        {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role
        },
        refreshSecret,
        {
          expiresIn:
            `${expiryDays}d`
        }
      );

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    // Login history
    const ip =
      req.ip ||
      req.headers['x-forwarded-for'] ||
      req.socket.remoteAddress ||
      'Unknown IP';

    const ua =
      req.headers['user-agent'] || '';

    const {
      browser,
      device
    } = parseUserAgent(ua);

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        device,
        browser
      }
    });

    // Legacy session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo:
          ua ||
          'Unknown Device',
        ipAddress: ip,
        status: 'active'
      }
    });

    return res.json({
      success: true,
      token:
        `Bearer ${accessToken}`,
      refreshToken,
      isNewUser,

      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        gender: user.gender,
        dob:
          user.dob
            ? user.dob
              .toISOString()
              .split('T')[0]
            : null,
        profileImage:
          user.profileImage,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
};


// Cache to prevent race conditions during token refresh across concurrent requests or multiple tabs
const rotatedTokensCache = new Map(); // token -> { token, refreshToken, rotatedAt }
const pendingRefreshes = new Map(); // token -> Promise<{ token, refreshToken }>

export const refresh = async (
  req,
  res,
  next
) => {
  const {
    refreshToken
  } = req.body;

  if (!refreshToken) {
    return next(
      new BadRequestError(
        'Refresh token is required.'
      )
    );
  }

  // 1. Check if this token was recently rotated (grace period for concurrent requests / tabs)
  if (rotatedTokensCache.has(refreshToken)) {
    const cached = rotatedTokensCache.get(refreshToken);
    if (Date.now() - cached.rotatedAt < 30000) {
      return res.status(200).json({
        success: true,
        token: cached.token,
        refreshToken: cached.refreshToken
      });
    }
  }

  // 2. Check if this token is currently in the middle of being refreshed (concurrency lock)
  if (pendingRefreshes.has(refreshToken)) {
    try {
      const cachedResult = await pendingRefreshes.get(refreshToken);
      return res.status(200).json({
        success: true,
        token: cachedResult.token,
        refreshToken: cachedResult.refreshToken
      });
    } catch (refreshErr) {
      return next(refreshErr);
    }
  }

  const refreshPromise = (async () => {
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      'refresh_secret';

    return new Promise((resolve, reject) => {
      jwt.verify(
        refreshToken,
        refreshSecret,
        async (
          err,
          decoded
        ) => {
          if (err) {
            return reject(
              new ForbiddenError(
                'Invalid or expired refresh token. Please login again.'
              )
            );
          }

          try {
            const dbToken =
              await prisma.refreshToken.findUnique({
                where: {
                  token: refreshToken
                }
              });

            if (
              !dbToken ||
              dbToken.expiresAt <
              new Date()
            ) {
              if (dbToken) {
                await prisma.refreshToken
                  .delete({
                    where: {
                      id: dbToken.id
                    }
                  })
                  .catch(() => { });
              }

              return reject(
                new ForbiddenError(
                  'Your session has expired or has been revoked. Please sign in again.'
                )
              );
            }

            const user =
              await prisma.user.findUnique({
                where: {
                  id: decoded.id
                }
              });

            if (
              !user ||
              user.status === 'banned'
            ) {
              return reject(
                new ForbiddenError(
                  'Your account is disabled or no longer exists.'
                )
              );
            }

            const jwtSecret =
              process.env.JWT_SECRET ||
              'secret';

            const accessToken =
              jwt.sign(
                {
                  id: user.id,
                  email: user.email,
                  phone: user.phone,
                  role: user.role
                },
                jwtSecret,
                {
                  expiresIn: '15m'
                }
              );

            const nextExpiresAt =
              dbToken.expiresAt;

            const daysLeft =
              Math.max(
                1,
                Math.ceil(
                  (nextExpiresAt.getTime() -
                    Date.now()) /
                  (1000 *
                    60 *
                    60 *
                    24)
                )
              );

            const nextRefreshToken =
              jwt.sign(
                {
                  id: user.id,
                  email: user.email,
                  phone: user.phone,
                  role: user.role
                },
                process.env
                  .JWT_REFRESH_SECRET ||
                'refresh_secret',
                {
                  expiresIn:
                    `${daysLeft}d`
                }
              );

            // Delete old token
            await prisma.refreshToken
              .delete({
                where: {
                  id: dbToken.id
                }
              })
              .catch(() => { });

            // Store new token
            await prisma.refreshToken.create({
              data: {
                token:
                  nextRefreshToken,
                userId: user.id,
                expiresAt:
                  nextExpiresAt
              }
            });

            // Save to rotatedTokensCache to handle race conditions (grace period of 30 seconds)
            rotatedTokensCache.set(refreshToken, {
              token: `Bearer ${accessToken}`,
              refreshToken: nextRefreshToken,
              rotatedAt: Date.now()
            });
            setTimeout(() => {
              rotatedTokensCache.delete(refreshToken);
            }, 30000);

            // Update legacy session
            const session =
              await prisma.userSession.findFirst({
                where: {
                  refreshToken,
                  userId:
                    user.id
                }
              });

            if (session) {
              await prisma.userSession.update({
                where: {
                  id: session.id
                },
                data: {
                  refreshToken:
                    nextRefreshToken,
                  lastActivity:
                    new Date(),
                  lastLogin:
                    new Date()
                }
              });
            }

            resolve({
              token: `Bearer ${accessToken}`,
              refreshToken: nextRefreshToken
            });

          } catch (innerError) {
            reject(innerError);
          }
        }
      );
    });
  })();

  pendingRefreshes.set(refreshToken, refreshPromise);

  try {
    const result = await refreshPromise;
    return res.status(200).json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    next(error);
  } finally {
    pendingRefreshes.delete(refreshToken);
  }
};


// ============================================================
// LOGOUT
// ============================================================

export const logout = async (
  req,
  res,
  next
) => {
  const {
    refreshToken
  } = req.body;

  try {
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken
        }
      });

      await prisma.userSession.updateMany({
        where: {
          refreshToken
        },
        data: {
          status: 'revoked',
          logoutTime: new Date()
        }
      });
    } else if (req.user) {
      await prisma.refreshToken.deleteMany({
        where: {
          userId: req.user.id
        }
      });

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
    }

    return res.json({
      success: true,
      message:
        'Session logged out and invalidated successfully.'
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// GET SESSIONS
// ============================================================

export const getSessions = async (
  req,
  res,
  next
) => {
  try {
    const sessions =
      await prisma.userSession.findMany({
        where: {
          userId: req.user.id
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

    return res.json({
      success: true,
      sessions
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// REVOKE ONE SESSION
// ============================================================

export const revokeSession = async (
  req,
  res,
  next
) => {
  const { id } =
    req.params;

  try {
    const session =
      await prisma.userSession.findUnique({
        where: {
          id
        }
      });

    if (
      !session ||
      session.userId !==
      req.user.id
    ) {
      return next(
        new NotFoundError(
          'Session not found or unauthorized.'
        )
      );
    }

    await prisma.userSession.update({
      where: {
        id
      },
      data: {
        status: 'revoked',
        logoutTime:
          new Date()
      }
    });

    await prisma.refreshToken.deleteMany({
      where: {
        token:
          session.refreshToken
      }
    });

    return res.json({
      success: true,
      message:
        'Session successfully revoked.'
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// REVOKE ALL SESSIONS
// ============================================================

export const revokeAllSessions = async (
  req,
  res,
  next
) => {
  try {
    await prisma.userSession.updateMany({
      where: {
        userId:
          req.user.id,
        status:
          'active'
      },
      data: {
        status: 'revoked',
        logoutTime:
          new Date()
      }
    });

    await prisma.refreshToken.deleteMany({
      where: {
        userId:
          req.user.id
      }
    });

    return res.json({
      success: true,
      message:
        'All sessions successfully revoked.'
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// GUEST LOGIN
// ============================================================

export const guestLogin = async (
  req,
  res,
  next
) => {
  try {
    const guestPhone =
      `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    const user =
      await prisma.user.create({
        data: {
          phone: guestPhone,
          name:
            `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
          role:
            'customer',
          status:
            'active'
        }
      });

    const token =
      jwt.sign(
        {
          id: user.id,
          role: user.role
        },
        process.env.JWT_SECRET ||
        'fallback_secret',
        {
          expiresIn: '1d'
        }
      );

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      'refresh_secret';

    const refreshTokenVal = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      refreshSecret,
      {
        expiresIn: '30d'
      }
    );

    const refreshExpiry =
      new Date(
        Date.now() +
        30 *
        24 *
        60 *
        60 *
        1000
      );

    await prisma.refreshToken.create({
      data: {
        token:
          refreshTokenVal,
        userId: user.id,
        expiresAt:
          refreshExpiry
      }
    });

    const uaInfo =
      parseUserAgent(
        req.headers[
        'user-agent'
        ]
      );

    const ip =
      req.ip ||
      req.headers[
      'x-forwarded-for'
      ] ||
      '';

    await prisma.loginHistory.create({
      data: {
        userId: user.id,
        ip,
        device:
          uaInfo.device,
        browser:
          uaInfo.browser
      }
    });

    return res.status(200).json({
      success: true,
      token,
      refreshToken:
        refreshTokenVal,

      user: {
        id: user.id,
        name:
          user.name,
        phone:
          user.phone,
        role:
          user.role
      }
    });

  } catch (error) {
    next(error);
  }
};


// ============================================================
// FREE CUSTOMER LOGIN
// ============================================================
// No OTP.
// No SMS.
// No paid service.
//
// User enters name + phone.
// ============================================================

export const simpleLogin = async (
  req,
  res,
  next
) => {
  const {
    phone,
    name,
    rememberMe
  } = req.body;

  if (!phone) {
    return next(
      new BadRequestError(
        'Mobile number is required.'
      )
    );
  }

  if (
    !name ||
    !name.trim()
  ) {
    return next(
      new BadRequestError(
        'Name is required.'
      )
    );
  }

  let cleanedPhone = phone
    .trim()
    .replace(/[^0-9]/g, '');

  if (
    cleanedPhone.length > 10 &&
    cleanedPhone.startsWith('91')
  ) {
    cleanedPhone =
      cleanedPhone.substring(2);
  }

  // Indian mobile validation
  const phoneRegex =
    /^[6-9]\d{9}$/;

  if (
    cleanedPhone.length !== 10 ||
    !phoneRegex.test(
      cleanedPhone
    )
  ) {
    return next(
      new BadRequestError(
        'Please enter a valid 10-digit Indian mobile number.'
      )
    );
  }

  try {
    let user =
      await prisma.user.findUnique({
        where: {
          phone:
            cleanedPhone
        }
      });

    if (
      user &&
      user.status ===
      'banned'
    ) {
      return next(
        new ForbiddenError(
          'Your account has been disabled. Please contact support.'
        )
      );
    }

    // Existing customer
    if (user) {
      user =
        await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            name:
              name.trim()
          }
        });
    }

    // New customer
    else {
      user =
        await prisma.user.create({
          data: {
            phone:
              cleanedPhone,
            name:
              name.trim(),
            role:
              'customer',
            status:
              'active'
          }
        });
    }

    // Access token
    const token =
      jwt.sign(
        {
          id: user.id,
          role: user.role
        },
        process.env.JWT_SECRET ||
        'fallback_secret',
        {
          expiresIn:
            '1d'
        }
      );

    // Refresh token
    const expiryDays =
      rememberMe ? 30 : 1;

    const refreshExpiry =
      new Date(
        Date.now() +
        expiryDays *
        24 *
        60 *
        60 *
        1000
      );

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      'refresh_secret';

    const refreshTokenVal = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      refreshSecret,
      {
        expiresIn: `${expiryDays}d`
      }
    );

    await prisma.refreshToken.create({
      data: {
        token:
          refreshTokenVal,
        userId:
          user.id,
        expiresAt:
          refreshExpiry
      }
    });

    // Login history
    const uaInfo =
      parseUserAgent(
        req.headers[
        'user-agent'
        ]
      );

    const ip =
      req.ip ||
      req.headers[
      'x-forwarded-for'
      ] ||
      '';

    await prisma.loginHistory.create({
      data: {
        userId:
          user.id,
        ip,
        device:
          uaInfo.device,
        browser:
          uaInfo.browser
      }
    });

    // Legacy session
    await prisma.userSession.create({
      data: {
        userId:
          user.id,
        refreshToken:
          refreshTokenVal,
        loginTime:
          new Date(),
        lastActivity:
          new Date(),
        lastLogin:
          new Date(),
        deviceInfo:
          `${uaInfo.browser} on ${uaInfo.device}`,
        ipAddress:
          ip,
        status:
          'active'
      }
    });

    return res.status(200).json({
      success: true,

      token,

      refreshToken:
        refreshTokenVal,

      user: {
        id: user.id,
        name:
          user.name,
        phone:
          user.phone,
        role:
          user.role
      }
    });

  } catch (error) {
    next(error);
  }
};