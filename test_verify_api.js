const http = require('http');

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/certificates/verify/CERT-TEST-001',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', data);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
