const { sendOtpEmail } = require('./src/backend/lib/email.ts');
require('dotenv').config();

async function test() {
  console.log("Testing email...");
  const res = await sendOtpEmail({
    to: 'mirwangenius06@gmail.com',
    otp: '123456',
    userName: 'Mirwan'
  });
  console.log("Result:", res);
}

test();
