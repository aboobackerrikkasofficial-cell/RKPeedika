import axios from 'axios';

export default {
  async sendOTP(phone, otp) {
    const apiKey = process.env.TEXTLOCAL_API_KEY;
    const sender = process.env.TEXTLOCAL_SENDER || 'TXTLCL';
    if (!apiKey) {
      console.warn('[TextLocal] Missing TEXTLOCAL_API_KEY in environment variables. Simulating send.');
      return { success: true, simulated: true };
    }
    try {
      const response = await axios.post('https://api.textlocal.in/send/', new URLSearchParams({
        apikey: apiKey,
        numbers: phone.replace('+', ''),
        sender: sender,
        message: `Your OTP is ${otp}. Please use this to verify your mobile number.`
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return { success: response.data.status === 'success', response: response.data };
    } catch (error) {
      console.error('[TextLocal] Error sending OTP:', error.message);
      throw error;
    }
  }
};
