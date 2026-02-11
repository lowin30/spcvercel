const https = require('https');

const data = JSON.stringify({
    email: 'lowin30@gmail.com'
});

const options = {
    hostname: 'spcvercel.vercel.app',
    port: 443,
    path: '/api/auth/webauthn/login-challenge',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    res.on('end', () => {
        console.log('BODY:', body);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
