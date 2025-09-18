#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const path = require("path");

const tsxPath = path.join(__dirname, "..", "node_modules", ".bin", "tsx");
const scriptPath = path.join(__dirname, "..", "src", "cli", "index.ts");

try {
  execSync(`"${tsxPath}" "${scriptPath}" ${process.argv.slice(2).join(" ")}`, {
    stdio: "inherit"
  });
} catch (error) {
  process.exit(error.status || 1);
}
