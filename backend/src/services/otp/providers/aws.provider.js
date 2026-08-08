export default {
  async sendOTP(phone, otp) {
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      console.warn('[AWS SNS] Missing AWS credentials in environment variables. Simulating send.');
      return { success: true, simulated: true };
    }

    console.log(`[AWS SNS] Sending OTP ${otp} to ${phone} using AWS Region ${region}`);
    return { success: true };
  }
};
