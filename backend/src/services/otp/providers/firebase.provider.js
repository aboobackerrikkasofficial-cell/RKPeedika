import jwt from 'jsonwebtoken';
import axios from 'axios';

let googlePublicKeysCache = null;
let googlePublicKeysExpiry = 0;

async function getGooglePublicKeys() {
  const now = Date.now();
  if (googlePublicKeysCache && now < googlePublicKeysExpiry) {
    return googlePublicKeysCache;
  }
  try {
    const response = await axios.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken-system@system.gserviceaccount.com');
    googlePublicKeysCache = response.data;
    googlePublicKeysExpiry = now + 3600 * 1000;
    return googlePublicKeysCache;
  } catch (error) {
    console.error('[Firebase Provider] Failed to fetch Google public keys:', error.message);
    throw error;
  }
}

export default {
  async sendOTP(phone, otp) {
    console.log(`[Firebase Provider] sendOTP called for ${phone}. Simulated OK since frontend manages Firebase Auth flow.`);
    return { success: true, provider: 'firebase' };
  },

  async verifyOTP(phone, code, verificationData = {}) {
    const idToken = code;
    if (!idToken) {
      throw new Error('Firebase ID Token is missing.');
    }

    try {
      if (process.env.NODE_ENV === 'development' && idToken.startsWith('mock_firebase_token_')) {
        const mockedPhone = idToken.substring('mock_firebase_token_'.length);
        console.log(`[Firebase Provider] Verifying mocked Firebase Token for phone: ${mockedPhone}`);
        return mockedPhone === phone;
      }

      const decodedUnverified = jwt.decode(idToken, { complete: true });
      if (!decodedUnverified || !decodedUnverified.header || !decodedUnverified.header.kid) {
        throw new Error('Invalid Firebase ID Token format.');
      }

      const kid = decodedUnverified.header.kid;
      const keys = await getGooglePublicKeys();
      const publicKey = keys[kid];

      if (!publicKey) {
        throw new Error('Google public key not found for kid.');
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || 'mock-firebase-project';

      const decoded = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: projectId,
        issuer: `https://securetoken.google.com/${projectId}`
      });

      const tokenPhone = decoded.phone_number;
      if (!tokenPhone) {
        throw new Error('Phone number is missing from Firebase ID Token.');
      }

      const cleanTokenPhone = tokenPhone.replace('+', '').replace(/^91/, '');
      const cleanInputPhone = phone.replace('+', '').replace(/^91/, '');

      return cleanTokenPhone === cleanInputPhone;
    } catch (error) {
      console.error('[Firebase Provider] Token verification failed:', error.message);
      return false;
    }
  }
};
