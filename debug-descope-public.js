const https = require('https');
const projectId = 'P39Y887u1otOQcg8nI38s878J2nT'; // Hardcoded from .env.local

console.log(`Fetching Public Config for Project: ${projectId}`);

const options = {
    hostname: 'api.descope.com',
    path: `/v2/info/project?projectId=${projectId}`, // Trying v2 info endpoint which is often public or client-accessible
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

// Also try to get flow config if possible
// The SDK fetches config from: https://api.descope.com/v2/config/project?projectId=...

const req = https.request({
    hostname: 'api.descope.com',
    path: `/v2/config/project?projectId=${projectId}`,
    method: 'GET'
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('\n--- /v2/config/project Response ---');
        console.log('Status:', res.statusCode);
        try {
            const parsed = JSON.parse(body);
            console.log(JSON.stringify(parsed, null, 2));
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
