---
description: Package manager preference for SPC project
---

# Package Manager: PNPM

**CRITICAL: This project uses `pnpm`, NOT `npm`**

## Rules

1. **ALWAYS use `pnpm` for package management commands**
   - Installation: `pnpm add <package>` or `pnpm install`
   - Remove: `pnpm remove <package>`
   - Run scripts: `pnpm run dev`, `pnpm build`, etc.

2. **NEVER use `npm install`** - it's extremely slow and can cause conflicts with the existing `pnpm-lock.yaml`

3. **Why pnpm?**
   - Much faster installation (npm takes 15+ minutes, pnpm takes seconds)
   - Better disk space efficiency
   - Stricter dependency resolution
   - Already configured in this project (pnpm-lock.yaml exists)

## Common Commands

```bash
# Install dependencies
pnpm install

# Add new package
pnpm add <package-name>

# Add dev dependency
pnpm add -D <package-name>

# Remove package
pnpm remove <package-name>

# Run dev server
pnpm run dev

# Build for production
pnpm build
```

## If npm is accidentally used

If you accidentally run `npm install`, stop it immediately and:
1. Delete `node_modules` folder
2. Delete any `package-lock.json` if created
3. Run `pnpm install` instead
