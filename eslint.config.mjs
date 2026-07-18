import globals from "globals";
export default [
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022, sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.es2021 },
    },
    rules: { "no-undef": "error", "no-unused-vars": ["error", { varsIgnorePattern: "^React$", args: "none", caughtErrors: "none" }] },
  },
];
