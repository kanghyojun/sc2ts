#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Post-process the build to create proper dual packaging
 * - CJS files stay in dist/ as .js
 * - ESM files from dist-esm/ are copied to dist/ as .mjs
 */

function copyAndRename(src, dest, renameExt = null) {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory ${src} does not exist`);
    return;
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyAndRename(srcPath, destPath, renameExt);
    } else if (entry.isFile()) {
      if (renameExt && entry.name.endsWith('.js')) {
        destPath = destPath.replace(/\.js$/, '.mjs');
      }

      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Post-processing build files...');

// Copy ESM files from dist-esm to dist with .mjs extension
copyAndRename('./dist-esm', './dist', '.mjs');

// Clean up temporary ESM directory
fs.rmSync('./dist-esm', { recursive: true, force: true });

// Make CLI executable
const cliPath = './dist/cli/index.js';
if (fs.existsSync(cliPath)) {
  fs.chmodSync(cliPath, 0o755);
  console.log('CLI file made executable');
}

console.log('Build post-processing complete!');
console.log('- CommonJS files: dist/*.js');
console.log('- ESM files: dist/*.mjs');
console.log('- CLI executable: dist/cli/index.js');