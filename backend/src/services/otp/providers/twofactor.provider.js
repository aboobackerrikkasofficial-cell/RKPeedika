import axios from 'axios';

export default {
  async sendOTP(phone, otp) {
    const apiKey = process.env.TWOFACTOR_API_KEY;
    if (!apiKey) {
      console.warn('[2Factor] Missing TWOFACTOR_API_KEY in environment variables. Simulating send.');
      return { success: true, simulated: true };
    }
    try {
      const formattedPhone = phone.replace('+', '');
      const url = `https://2factor.in/API/V1/${apiKey}/SMS/${formattedPhone}/${otp}/AUTOGEN`;
      const response = await axios.get(url);
      return { success: response.data.Status === 'Success', response: response.data };
    } catch (error) {
      console.error('[2Factor] Error sending OTP:', error.message);
      throw error;
    }
  }
};
