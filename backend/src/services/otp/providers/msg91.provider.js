import axios from 'axios';

export default {
  async sendOTP(phone, otp) {
    const apiKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!apiKey || !templateId) {
      console.warn('[MSG91] Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID in environment variables. Simulating send.');
      return { success: true, simulated: true };
    }
    const formattedPhone = phone.replace('+', '');
    try {
      const response = await axios.post(`https://api.msg91.com/api/v5/otp?template_id=${templateId}&mobile=${formattedPhone}&authkey=${apiKey}`, {
        otp: otp
      });
      return { success: response.data.type === 'success', response: response.data };
    } catch (error) {
      console.error('[MSG91] Error sending OTP:', error.message);
      throw error;
    }
  }
};
