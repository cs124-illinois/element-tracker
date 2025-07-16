// @ts-check

import eslint from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import hooksPlugin from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

export default [
  ...tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, {
    plugins: {
      "react-hooks": hooksPlugin,
    },
    // @ts-expect-error seems to work
    rules: {
      "@typescript-eslint/no-namespace": "off",
      "no-empty": "off",
      "@typescript-eslint/no-unused-expressions": [2, { allowShortCircuit: true, allowTernary: true }],
      ...hooksPlugin.configs.recommended.rules,
    },
  }),
  eslintConfigPrettier,
]
