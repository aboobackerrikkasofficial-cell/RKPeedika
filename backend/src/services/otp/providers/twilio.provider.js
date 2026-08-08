import axios from 'axios';

export default {
  async sendOTP(phone, otp) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken) {
      console.warn('[Twilio] Missing Twilio account credentials in environment variables. Simulating send.');
      return { success: true, simulated: true };
    }

    try {
      if (verifyServiceSid) {
        const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/Verifications`;
        const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const response = await axios.post(url, new URLSearchParams({
          To: phone,
          Channel: 'sms'
        }).toString(), {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return { success: response.data.status === 'pending', response: response.data };
      } else {
        if (!fromNumber) {
          throw new Error('TWILIO_FROM_NUMBER is required for standard SMS.');
        }
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const response = await axios.post(url, new URLSearchParams({
          To: phone,
          From: fromNumber,
          Body: `Your RK Peedika OTP code is ${otp}. Valid for 5 minutes.`
        }).toString(), {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        return { success: !!response.data.sid, response: response.data };
      }
    } catch (error) {
      console.error('[Twilio] Error sending:', error.response?.data || error.message);
      throw error;
    }
  },

  async verifyOTP(phone, code, verificationData = {}) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!verifyServiceSid) {
      return true;
    }

    try {
      const url = `https://verify.twilio.com/v2/Services/${verifyServiceSid}/VerificationCheck`;
      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const response = await axios.post(url, new URLSearchParams({
        To: phone,
        Code: code
      }).toString(), {
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      return response.data.status === 'approved';
    } catch (error) {
      console.error('[Twilio Verify] Error checking:', error.response?.data || error.message);
      return false;
    }
  }
};
