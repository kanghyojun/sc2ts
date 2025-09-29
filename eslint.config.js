const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const importPlugin = require("eslint-plugin-import");

module.exports = [
    // Base JavaScript configuration for all files
    js.configs.recommended,

    // TypeScript configuration - apply TypeScript rules only to TS files
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ["src/**/*.ts", "test/**/*.ts"],
    })),

    // TypeScript files configuration
    {
        files: ["src/**/*.ts"],
        plugins: { import: importPlugin },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.json",
            },
        },
        rules: {
            // TypeScript-specific rules
            "@typescript-eslint/no-unused-vars": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/prefer-nullish-coalescing": "error",
            "@typescript-eslint/prefer-optional-chain": "error",
            "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
            "@typescript-eslint/no-import-type-side-effects": "error",

            // General rules
            "no-console": "warn",
            "no-debugger": "error",
            "no-duplicate-imports": "error",
            "prefer-const": "error",
            "no-var": "error",

            // Import ordering
            "import/order": [
                "error",
                {
                    groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
                    "newlines-between": "always",
                    alphabetize: { order: "asc", caseInsensitive: true },
                },
            ],
            "import/newline-after-import": "error",
            "import/no-duplicates": "error",

            // Style
            quotes: ["error", "double"],
            semi: ["error", "always"],
            "comma-dangle": ["error", "always-multiline"],
            indent: ["error", 2],
            "object-curly-spacing": ["error", "always"],
            "array-bracket-spacing": ["error", "never"],
            "max-len": ["error", { "code": 120, "ignoreUrls": true, "ignoreStrings": true, "ignoreTemplateLiterals": true }],
        },
    },

    // Test files configuration (relaxed rules, use tsconfig.test.json)
    {
        files: ["test/**/*.ts"],
        plugins: { import: importPlugin },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.test.json",
            },
        },
        rules: {
            // Relaxed rules for test files
            "@typescript-eslint/no-explicit-any": "off",
            "no-console": "off",
            "@typescript-eslint/no-unused-vars": "off",

            // Import ordering (same as src)
            "import/order": [
                "error",
                {
                    groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
                    "newlines-between": "always",
                    alphabetize: { order: "asc", caseInsensitive: true },
                },
            ],
            "import/newline-after-import": "error",
            "import/no-duplicates": "error",
        },
    },

    // JavaScript files configuration (separate from TypeScript)
    {
        files: ["scripts/**/*.js", "**/*.mjs", "**/*.cjs"],
        plugins: { import: importPlugin },
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                require: "readonly",
                module: "readonly",
                exports: "readonly",
                console: "readonly",
                process: "readonly",
                __dirname: "readonly",
                __filename: "readonly",
                Buffer: "readonly",
                global: "readonly",
            },
        },
        rules: {
            // General rules (no TypeScript-specific rules)
            "no-unused-vars": "error",
            "no-console": "off", // Allow console in scripts
            "no-debugger": "error",
            "no-duplicate-imports": "error",
            "prefer-const": "error",
            "no-var": "error",

            // Import ordering
            "import/order": [
                "error",
                {
                    groups: [["builtin", "external"], ["internal"], ["parent", "sibling", "index"]],
                    "newlines-between": "always",
                    alphabetize: { order: "asc", caseInsensitive: true },
                },
            ],
            "import/newline-after-import": "error",
            "import/no-duplicates": "error",

            // Style (keep current style for JS files)
            quotes: ["error", "single"],
            semi: ["error", "always"],
            "comma-dangle": ["error", "always-multiline"],
            indent: ["error", 2],
            "object-curly-spacing": ["error", "always"],
            "array-bracket-spacing": ["error", "never"],
        },
    },

    // Ignored files
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "bin/*.js",
            "coverage/**",
            ".debug/**",
            ".reference/**",
            "eslint.config.js",
        ],
    },
];
