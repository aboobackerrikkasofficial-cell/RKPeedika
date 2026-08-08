export default {
  async sendOTP(phone, otp) {
    console.log(`\n==========================================`);
    console.log(`[DEVELOPMENT OTP PROVIDER]`);
    console.log(`Phone: ${phone}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`==========================================\n`);
    return { success: true, provider: 'development', otp };
  }
};
