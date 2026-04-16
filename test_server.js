const http = require('http');
const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/',
  method: 'GET',
  timeout: 2000
};

console.log('Checking port 5000...');
const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  process.exit(0);
});

req.on('error', (e) => {
  console.error(`ERROR: ${e.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('TIMEOUT: Server not responding');
  req.destroy();
  process.exit(1);
});

req.end();
