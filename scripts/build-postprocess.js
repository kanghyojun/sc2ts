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

      // Fix ESM imports: add .mjs extensions
      if (destPath.endsWith('.mjs')) {
        fixEsmImports(destPath);
      }
    }
  }
}

/**
 * Fix ESM imports by adding .mjs extensions to relative imports
 */
function fixEsmImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace relative imports without extensions with .mjs
  // Matches: from "./something" or from "../something" or from "./path/something"
  content = content.replace(
    /from\s+['"](\.\/?[^'"]+)['"]/g,
    (match, importPath) => {
      // Don't add extension if it already has one
      if (importPath.match(/\.(m?js|json)$/)) {
        return match;
      }
      // If it's a directory import (like './protocol'), add /index.mjs
      // Check if the path exists as a directory relative to the file
      const fileDir = path.dirname(filePath);
      const resolvedPath = path.resolve(fileDir, importPath);
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        return match.replace(importPath, importPath + '/index.mjs');
      }
      // Otherwise add .mjs extension
      return match.replace(importPath, importPath + '.mjs');
    },
  );

  // Also fix export ... from statements
  content = content.replace(
    /export\s+(?:\*|{[^}]+})\s+from\s+['"](\.\/?[^'"]+)['"]/g,
    (match, importPath) => {
      if (importPath.match(/\.(m?js|json)$/)) {
        return match;
      }
      // Check if it's a directory import
      const fileDir = path.dirname(filePath);
      const resolvedPath = path.resolve(fileDir, importPath);
      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
        return match.replace(importPath, importPath + '/index.mjs');
      }
      return match.replace(importPath, importPath + '.mjs');
    },
  );

  fs.writeFileSync(filePath, content, 'utf-8');
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