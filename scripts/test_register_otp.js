const http = require('http');

const ts = Date.now();
const data = JSON.stringify({
  jenisPendaftaran: 'nasabah',
  nik: `320${ts.toString().slice(-13)}`, // 16 digit
  name: `Test OTP User ${ts}`,
  tempatLahir: 'Bandung',
  tanggalLahir: '2000-01-01',
  jenisKelamin: 'Laki-laki',
  alamat: 'Jl Test 123',
  rt: '001',
  rw: '002',
  desaKelurahan: 'Sukamaju',
  kecamatan: 'Cimaung',
  phone: `0812${ts.toString().slice(-8)}`,
  email: `bssukamajusejahtera+${ts}@gmail.com`,
  pekerjaan: 'Wiraswasta',
  password: 'password123',
  fotoKtp: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
});

console.log(`Mengirim register request untuk email: bssukamajusejahtera+${ts}@gmail.com...`);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${body}`);
  });
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
