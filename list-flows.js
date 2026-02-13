const https = require('https');

const projectId = 'P39Y887u1otOQcg8nI38s878J2nT';

function testPreflight(origin) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.descope.com',
            path: '/v1/flow/start',
            method: 'OPTIONS',
            headers: {
                'Origin': origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'authorization,content-type'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`\nOrigin: "${origin}"`);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Access-Control-Allow-Origin: ${res.headers['access-control-allow-origin'] || 'NOT SET'}`);
            console.log(`Access-Control-Allow-Methods: ${res.headers['access-control-allow-methods'] || 'NOT SET'}`);
            console.log(`Access-Control-Allow-Headers: ${res.headers['access-control-allow-headers'] || 'NOT SET'}`);

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (data) {
                    try { console.log('Body:', JSON.stringify(JSON.parse(data), null, 2)); }
                    catch (e) { console.log('Body:', data.substring(0, 200)); }
                }
                resolve();
            });
        });
        req.on('error', (e) => { console.log(`Error: ${e.message}`); resolve(); });
        req.end();
    });
}

async function main() {
    console.log('Testing CORS Preflight for Descope Flow Start');
    console.log('Project:', projectId);

    await testPreflight('http://localhost:3000');
    await testPreflight('https://spcvercel.vercel.app');
    await testPreflight('http://evil.example.com');  // Should fail
}

main();
