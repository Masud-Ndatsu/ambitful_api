import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-console": "warn",
      "prefer-const": "error",
      quotes: ["error", "single"],
      semi: ["error", "always"],
    },
  },
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "prisma",
      "prisma/generated",
      "src/generated",
      "prisma/generated",
      "src/generated/prisma/**",
    ],
  },
]);
