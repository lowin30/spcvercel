const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let SUPABASE_URL, SUPABASE_SERVICE_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') SUPABASE_URL = value.trim();
            if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') SUPABASE_SERVICE_KEY = value.trim();
        }
    });
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Admin Credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const MIGRATION_FILE = path.join(__dirname, '../.agent/artifacts/add_webauthn_column.sql');
// Wait, artifacts path might be complex. Let's read the file I just wrote. 
// I wrote it to: c:\Users\Central 1\.gemini\antigravity\brain\5485ec26-54ec-4d96-ac9e-e0fb4f1cd045\add_webauthn_column.sql
// I can just paste the SQL content here for simplicity or read from absolute path.
// Simpler to embed content or read from known location if I can't guess the random ID path easily.
// I will just re-state the SQL here.

const SQL = `
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS webauthn_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE usuarios ALTER COLUMN rol SET DEFAULT 'operario';
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- Policies (Use DO block or attempt create and ignore error)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON usuarios FOR SELECT USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON usuarios FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;
`;

async function runMigration() {
    console.log("Applying Migration...");
    // Supabase JS doesn't support raw SQL query directly gracefully on client libs usually, 
    // unless using rpc() to a functionality that executes SQL, or using pg library.
    // BUT! Since I have connection string or service key...
    // Actually standard supabase-js client cannot execute RAW SQL (DDL) unless there is a specific RPC.

    // Fallback: I will use the Postgres connection string if available in env, or 
    // try to check if the column exists first?
    // Wait, the user asked me to use "MCP SUPABASE".
    // I tried `execute_sql` before and it failed.
    // Maybe I can try `execute_sql` again? It might have failed because I wasn't authenticated correctly in the tool?
    // No, the tool uses its own auth.

    // Alternative: I can't easily run DDL from nodejs supabase-js without an RPC.
    // I can assume the user handles DDL or I use `apply_migration` tool if user has configured it?
    // I will try `mcp_supabase-mcp-server_apply_migration`. It requires `project_id`.
    // I need the project ID. It's in the supabase URL: https://fodyzgjwoccpsjmfinvm.supabase.co -> fodyzgjwoccpsjmfinvm.

    // Let's use the TOOL `apply_migration`.
}
