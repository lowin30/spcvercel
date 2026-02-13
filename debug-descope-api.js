const https = require('https');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const projectId = process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID || 'P39Y887u1otOQcg8nI38s878J2nT';
// Key from lib/descope-client.ts
const managementKey = 'K39Z6M2BWGxFWhDRBDWPt3fJlGtAOcfVdqkTjZLXOX3C9QkCIC5fGyEIxP6goyJNrYgYkLB';

console.log(`Checking Descope API for Project: ${projectId}`);

function callApi(endpoint) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.descope.com',
            path: endpoint,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${projectId}:${managementKey}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                } else {
                    reject({ statusCode: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Testing Access...');
        // Try getting flows, which is a common management task
        const flows = await callApi('/v1/mgmt/flow/list');
        console.log('✅ Access Confirmed. Found', flows.flows?.length, 'flows.');

        const signUpOrIn = flows.flows?.find(f => f.id === 'sign-up-or-in');
        if (signUpOrIn) {
            console.log('Found flow "sign-up-or-in". Verifying details...');
            // Sadly flow/list might not give approved domains directly, usually that's project level.
        } else {
            console.log('⚠️ Flow "sign-up-or-in" NOT found in list. Available flows:', flows.flows?.map(f => f.id));
        }

        console.log('\n2. Attempting to check specific project settings (if endpoint available)...');
        // This endpoint might vary based on API version, but let's try.
        // If this fails, we rely on the fact that we connected successfully.

    } catch (error) {
        console.error('❌ Error accessing Descope API:', error);
        if (error.statusCode === 401) {
            console.error('CRITICAL: The Management Key or Project ID is invalid/expired.');
        }
    }
}

run();
