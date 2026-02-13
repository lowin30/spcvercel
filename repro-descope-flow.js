const https = require('https');
require('dotenv').config({ path: '.env.local' });

const projectId = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID || 'P39Y887u1otOQcg8nI38s878J2nT';
const flowId = 'sign-up-or-in';
const origin = 'http://localhost:3000';

console.log(`Testing Flow Start...`);
console.log(`Project ID: ${projectId}`);
console.log(`Flow ID: ${flowId}`);
console.log(`Origin: ${origin}`);

const data = JSON.stringify({
    flowId: flowId
});

const options = {
    hostname: 'api.descope.com',
    path: '/v1/flow/start',
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${projectId}`,
        'Content-Type': 'application/json',
        'Origin': origin,
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log(`\n--- Response ---`);
        console.log('Status:', res.statusCode);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        try {
            console.log('Body:', JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log('Body:', body);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
