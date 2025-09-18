#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create bin directory
const binDir = path.join(__dirname, '..', 'bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

// CLI wrapper script content
const cliWrapperContent = `#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const path = require("path");

const tsxPath = path.join(__dirname, "..", "node_modules", ".bin", "tsx");
const scriptPath = path.join(__dirname, "..", "src", "cli", "index.ts");

try {
  execSync(\`"\${tsxPath}" "\${scriptPath}" \${process.argv.slice(2).join(" ")}\`, {
    stdio: "inherit"
  });
} catch (error) {
  process.exit(error.status || 1);
}
`;

// Write the CLI wrapper
const cliPath = path.join(binDir, 'run.js');
fs.writeFileSync(cliPath, cliWrapperContent);

// Make it executable
fs.chmodSync(cliPath, '755');

console.log('✅ CLI wrapper created at:', cliPath);