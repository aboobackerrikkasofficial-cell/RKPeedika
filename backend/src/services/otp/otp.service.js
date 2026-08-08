import dotenv from 'dotenv';
dotenv.config();

import devProvider from './providers/development.provider.js';
import msg91Provider from './providers/msg91.provider.js';
import fast2smsProvider from './providers/fast2sms.provider.js';
import twilioProvider from './providers/twilio.provider.js';
import firebaseProvider from './providers/firebase.provider.js';
import awsProvider from './providers/aws.provider.js';
import twoFactorProvider from './providers/twofactor.provider.js';
import textLocalProvider from './providers/textlocal.provider.js';

const providers = {
  development: devProvider,
  dev: devProvider,
  msg91: msg91Provider,
  fast2sms: fast2smsProvider,
  twilio: twilioProvider,
  firebase: firebaseProvider,
  aws: awsProvider,
  twofactor: twoFactorProvider,
  textlocal: textLocalProvider
};

const providerName = (process.env.OTP_PROVIDER || 'development').toLowerCase();
const activeProvider = providers[providerName] || devProvider;

console.log(`[OTP SERVICE] Loaded active OTP provider: ${providerName}`);

export const otpService = {
  /**
   * Send an OTP code to the given phone number
   * @param {string} phone
   * @param {string} otp
   * @returns {Promise<any>}
   */
  async sendOTP(phone, otp) {
    if (activeProvider.sendOTP) {
      return activeProvider.sendOTP(phone, otp);
    }
    throw new Error(`sendOTP not implemented for provider ${providerName}`);
  },

  /**
   * Verify an OTP code if the provider manages verification itself (e.g. Twilio Verify, Firebase ID Token)
   * For standard SMS providers, verification is done by checking database records, so this returns true or throws.
   * @param {string} phone
   * @param {string} code
   * @param {object} [verificationData]
   * @returns {Promise<boolean>}
   */
  async verifyOTP(phone, code, verificationData = {}) {
    if (activeProvider.verifyOTP) {
      return activeProvider.verifyOTP(phone, code, verificationData);
    }
    // Default fallback: standard verification is done locally in controller,
    // so this is a no-op returning true (controllers verify using hashed OTP in database).
    return true;
  }
};
