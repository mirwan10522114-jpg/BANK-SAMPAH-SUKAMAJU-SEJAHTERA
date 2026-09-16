const http = require('http');

const data = JSON.stringify({
  items: [{ produkId: 'cmtn9u1x80062zdzk1oa0hskr', quantity: 1, price: 100 }],
  buyerName: 'Test Buyer',
  buyerPhone: '08123456789',
  buyerEmail: 'bssukamajusejahtera@gmail.com',
  paymentMethod: 'cash',
  total: 100,
  amountPaid: 100
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/toko/admin/pos?actingUser=cmtn7rxsq0000zdpwy5acbrhl', // Using a dummy or real actingUser
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
