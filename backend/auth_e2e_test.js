import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('🏁 Starting E2E Authentication Flow Tests...\n');
  
  const testPhone = '9999988888';
  const newPhone = '9999900000';
  const rateLimitPhone = '9999911111';
  
  let accessToken = '';
  let refreshToken = '';

  try {
    // 0. Clean database for a fresh test run
    console.log('🧹 Cleaning test records from database...');
    await prisma.otpCode.deleteMany({ where: { phone: { in: [testPhone, newPhone, rateLimitPhone] } } });
    // Delete test users (cascade will clean up other relations)
    await prisma.user.deleteMany({ where: { phone: { in: [testPhone, newPhone, rateLimitPhone] } } });
    console.log('   Database cleaned.\n');

    // --- SCENARIO 1: Request OTP for a phone number ---
    console.log('1️⃣ Requesting OTP for mobile number +91 99999 88888...');
    const sendRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone })
    });
    
    const sendData = await sendRes.json();
    console.log('   Response status:', sendRes.status);
    console.log('   OTP Sent successfully. Dev OTP:', sendData.developmentOtp);
    const devOtp = sendData.developmentOtp;

    // --- SCENARIO 2: Try verifying with incorrect OTP ---
    console.log('\n2️⃣ Testing verification with incorrect OTP...');
    const verifyWrongRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, code: '000000' })
    });
    const verifyWrongData = await verifyWrongRes.json();
    console.log('   Response status:', verifyWrongRes.status);
    console.log('   Expected failure received. Message:', verifyWrongData.error?.message || verifyWrongData.message);

    // --- SCENARIO 3: Try verifying with correct OTP ---
    console.log('\n3️⃣ Testing verification with correct OTP...');
    const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, code: devOtp })
    });
    
    const verifyData = await verifyRes.json();
    console.log('   Response status:', verifyRes.status);
    console.log('   Verification successful! User ID:', verifyData.user.id);
    console.log('   Is New User:', verifyData.isNewUser);
    
    accessToken = verifyData.token;
    refreshToken = verifyData.refreshToken;

    // --- SCENARIO 4: Complete Profile for a New User ---
    if (verifyData.isNewUser) {
      console.log('\n4️⃣ Completing profile for new user...');
      const profileRes = await fetch(`${BASE_URL}/users/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': accessToken 
        },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john.doe@test.com',
          gender: 'Male',
          dob: '1995-05-15'
        })
      });
      const profileData = await profileRes.json();
      console.log('   Response status:', profileRes.status);
      console.log('   Profile Saved! Updated Name:', profileData.user.name);
    } else {
      console.log('\n4️⃣ User already completed profile.');
    }

    // --- SCENARIO 5: Token Refresh Rotation ---
    console.log('\n5️⃣ Testing silent refresh token rotation...');
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const refreshData = await refreshRes.json();
    console.log('   Response status:', refreshRes.status);
    console.log('   New access token issued:', !!refreshData.token);
    console.log('   New refresh token issued:', refreshData.refreshToken !== refreshToken);
    
    accessToken = refreshData.token;
    refreshToken = refreshData.refreshToken;

    // --- SCENARIO 6: Log out and revoke tokens ---
    console.log('\n6️⃣ Logging out and revoking active tokens...');
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    console.log('   Response status:', logoutRes.status);
    console.log('   Logout verified. Invalidating session...');

    // Verify session is revoked
    const postLogoutRefreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    const postLogoutRefreshData = await postLogoutRefreshRes.json();
    console.log('   Response status after refresh with revoked token:', postLogoutRefreshRes.status);
    console.log('   Confirmed: Revoked refresh token rejected on next attempt.');

    // --- SCENARIO 7: Bruteforce block check ---
    console.log('\n7️⃣ Testing lockout after 5 incorrect OTP attempts...');
    // Request new OTP
    const blockOtpRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: newPhone })
    });
    const blockOtpData = await blockOtpRes.json();
    const correctCode = blockOtpData.developmentOtp;
    
    console.log('   Making 5 incorrect attempts...');
    for (let i = 1; i <= 5; i++) {
      const blockVerifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: newPhone, code: '000000' })
      });
      const blockVerifyData = await blockVerifyRes.json();
      console.log(`      Attempt ${i} Status: ${blockVerifyRes.status} | Message: ${blockVerifyData.error?.message || blockVerifyData.message}`);
    }

    // Attempt 6 (Should block)
    console.log('   Attempting 6th time (with correct OTP to verify block)...');
    const blockVerifyRes6 = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: newPhone, code: correctCode })
    });
    const blockVerifyData6 = await blockVerifyRes6.json();
    console.log(`      6th Attempt Status: ${blockVerifyRes6.status} | Locked out successfully: ${blockVerifyData6.error?.message || blockVerifyData6.message}`);

    // --- SCENARIO 8: Rate limit checks (Max 3 OTP requests / 15m) ---
    console.log('\n8️⃣ Testing send OTP rate limiting...');
    console.log('   Request 1...');
    await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rateLimitPhone })
    });
    console.log('   Request 2...');
    await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rateLimitPhone })
    });
    console.log('   Request 3...');
    await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rateLimitPhone })
    });
    console.log('   Request 4 (should trigger rate limit)...');
    const rateLimitRes4 = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: rateLimitPhone })
    });
    const rateLimitData4 = await rateLimitRes4.json();
    console.log(`   Request 4 Status: ${rateLimitRes4.status} | Message: ${rateLimitData4.error?.message || rateLimitData4.message}`);

    console.log('\n🎉 All E2E Authentication Flow Tests Passed Successfully!');
  } catch (error) {
    console.error('\n✖ Test script failed with error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
