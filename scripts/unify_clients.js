const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'app');

function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        try {
            if (fs.statSync(dirFile).isDirectory()) {
                filelist = walkSync(dirFile, filelist);
            } else {
                if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
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

    // Replace createSsrServerClient
    content = content.replace(/import\s+{\s*createSsrServerClient\s*}\s+from\s+['"]@\/lib\/ssr-server['"][;]?/g, "import { createServerClient } from '@/lib/supabase-server'");
    content = content.replace(/createSsrServerClient/g, 'createServerClient');

    // Replace createSupabaseServerClient
    content = content.replace(/import\s+{\s*createSupabaseServerClient\s*}\s+from\s+['"]@\/lib\/supabase\/server['"][;]?/g, "import { createServerClient } from '@/lib/supabase-server'");
    content = content.replace(/createSupabaseServerClient/g, 'createServerClient');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
        changedCount++;
    }
});

console.log(`Done. Updated ${changedCount} files.`);
