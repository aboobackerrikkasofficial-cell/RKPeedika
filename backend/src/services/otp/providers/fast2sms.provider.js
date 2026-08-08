import axios from 'axios';

export default {
  async sendOTP(phone, otp) {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      console.warn('[Fast2SMS] Missing FAST2SMS_API_KEY in environment variables. Simulating send.');
      return { success: true, simulated: true };
    }
    try {
      const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        variables_values: otp,
        route: 'otp',
        numbers: phone.replace('+', '')
      }, {
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        }
      });
      return { success: response.data.return === true, response: response.data };
    } catch (error) {
      console.error('[Fast2SMS] Error sending OTP:', error.message);
      throw error;
    }
  }
};
