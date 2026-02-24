const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'app', 'dashboard');

function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        try {
            if (fs.statSync(dirFile).isDirectory()) {
                filelist = walkSync(dirFile, filelist);
            } else {
                if (dirFile.endsWith('loader.ts') || dirFile.endsWith('actions.ts')) {
                    filelist.push(dirFile);
                }
            }
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
        }
    });
    return filelist;
}

const files = walkSync(targetDir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Protect against renaming the import alias
    if (content.includes("supabaseAdmin as supabase")) {
        content = content.replace(/import\s+{\s*supabaseAdmin\s+as\s+supabase\s*}\s+from\s+['"]@\/lib\/supabase-admin['"][;]?/g, "import { createServerClient } from '@/lib/supabase-server'");
    } else {
        content = content.replace(/import\s+{\s*supabaseAdmin\s*}\s+from\s+['"]@\/lib\/supabase-admin['"][;]?/g, "import { createServerClient } from '@/lib/supabase-server'");

        // Replace inline usage: `supabaseAdmin.from` -> `(await createServerClient()).from`
        content = content.replace(/supabaseAdmin\.from/g, '(await createServerClient()).from');
        content = content.replace(/supabaseAdmin\.rpc/g, '(await createServerClient()).rpc');
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
        changedCount++;
    }
});

console.log(`Done. Updated ${changedCount} files.`);
