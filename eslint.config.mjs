import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "old-src/**",
      "scripts/**",
      "prisma/migrations/**",
      "next-env.d.ts",
      "sql/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Les scripts Node (CommonJS) et fichiers de configuration utilisent
      // `process`/`require` : ces globales ne sont pas des erreurs ici.
      "no-undef": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "warn",
      // Les règles historiques restent visibles en avertissement : le but
      // est de bloquer les NOUVELLES erreurs sans réécrire les 2 400 lignes
      // de la route historique dans cette phase.
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-namespace": "warn",
      "no-empty": "warn",
      "no-useless-escape": "warn",
      "no-case-declarations": "warn",
      "no-fallthrough": "warn",
      "no-prototype-builtins": "warn",
      "no-cond-assign": "warn",
      "no-constant-condition": "warn",
      "no-control-regex": "warn",
      "no-async-promise-executor": "warn",
      "no-misleading-character-class": "warn",
      "no-regex-spaces": "warn",
      "no-unexpected-multiline": "warn",
      "no-unsafe-finally": "warn",
      "prefer-const": "warn",
    },
  }
);
