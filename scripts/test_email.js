require('dotenv').config();
const nodemailer = require('nodemailer');
async function test() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self
      subject: "Test Connection",
      text: "Test body",
    });
    console.log("Success:", info.messageId);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
