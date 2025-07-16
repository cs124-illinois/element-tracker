// @ts-check

import eslint from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import eslintPluginPrettier from "eslint-plugin-prettier"
import tseslint from "typescript-eslint"

export default [
  {
    ignores: ["dist/**"],
  },
  ...tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-empty": "off",
    },
  }),
  eslintConfigPrettier,
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
]
