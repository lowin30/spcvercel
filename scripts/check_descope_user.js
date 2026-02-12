const https = require('https');

const PROJECT_ID = 'P39Y887u1otOQcg8ni38s878J2nT'; // Try lowercase
const MANAGEMENT_KEY = 'K39Z6M2BWGxFWhDRBDWPt3fJlGtAOcfVdqkTjZLXOX3C9QkCIC5fGyEIxP6goyJNrYgYkLB';
const AUTH_HEADER = `Bearer ${PROJECT_ID}:${MANAGEMENT_KEY}`;

const loginId = 'lowin30@gmail.com';

function fetchUser() {
    const options = {
        hostname: 'api.descope.com',
        path: `/v1/mgmt/user?loginId=${encodeURIComponent(loginId)}`,
        method: 'GET',
        headers: {
            'Authorization': AUTH_HEADER,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Status:', res.statusCode);
            try {
                const json = JSON.parse(data);
                console.log(JSON.stringify(json, null, 2));
            } catch (e) {
                console.log('Body:', data);
            }
        });
    });

    req.on('error', (e) => {
        console.error('Error:', e);
    });

    req.end();
}

console.log(`Searching for user ${loginId}...`);
fetchUser();
