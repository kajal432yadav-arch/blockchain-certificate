const http = require('http');

const data = JSON.stringify({
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin'
});

const options = {
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => responseBody += chunk);
    res.on('end', () => {
        if (res.statusCode === 201) {
            console.log('✅ Success: Admin account registered!');
            console.log('Email: admin@example.com');
            console.log('Password: password123');
        } else {
            console.log('❌ Error:', responseBody);
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Problem with request: ${e.message}`);
});

req.write(data);
req.end();
