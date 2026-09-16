require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Fallback

const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('--- TEST EMAIL DELIVERY ---');
  
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`SMTP_HOST: ${host}`);
  console.log(`SMTP_PORT: ${port}`);
  console.log(`SMTP_USER: ${user ? user : 'NOT SET'}`);
  console.log(`SMTP_PASS: ${pass ? '*** SET ***' : 'NOT SET'}`);

  if (!user || !pass) {
    console.error('❌ ERROR: SMTP_USER atau SMTP_PASS belum diatur di .env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  try {
    console.log('\nMenguji koneksi ke SMTP server...');
    await transporter.verify();
    console.log('✅ Koneksi SMTP berhasil!');

    console.log(`\nMencoba mengirim email test ke ${user}...`);
    const info = await transporter.sendMail({
      from: `"Test Bank Sampah" <${user}>`,
      to: user, // Kirim ke diri sendiri untuk test
      subject: "Test Pengiriman Email - Bank Sampah",
      text: "Jika Anda menerima email ini, berarti konfigurasi email di Bank Sampah sudah benar dan email bisa terkirim.",
      html: "<h3>Test Email Berhasil</h3><p>Jika Anda menerima email ini, berarti konfigurasi email di Bank Sampah sudah benar dan email bisa terkirim.</p>"
    });

    console.log('✅ Email berhasil terkirim!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('\n❌ GAGAL: Terjadi error saat menguji email:');
    console.error(error.message);
    if (error.response) console.error('Response:', error.response);
  }
}

testEmail();
