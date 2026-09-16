const { sendOtpEmail } = require('./src/backend/lib/email');

async function test() {
  const result = await sendOtpEmail({
    to: 'test@example.com',
    otp: '123456',
    userName: 'Test User'
  });
  console.log(result);
}

test().catch(console.error);
