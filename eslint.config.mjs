import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/out/**',
      // Ignore generated sources and Prisma client types to avoid lint noise (e.g., no-empty-object-type)
      '**/src/generated/**',
      '**/src/generated/prisma/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      '**/prisma/migrations/**',
      '**/.git/**',
      '**/.husky/**',
      '**/docker/**',
      '**/diagrams/**',
      '**/.idea/**',
      '**/.vscode/**',
      '**/backups/**',
      '**/logs/**',
      '**/uploads/**',
      '**/public/**',
      '**/.env*',
      '**/yarn.lock',
      '**/package-lock.json',
      '**/tsconfig.tsbuildinfo',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-namespace': 'off',
      // Generated Prisma d.ts files frequently use `{}` types; ensure we don't fail CI if any remain
      '@typescript-eslint/no-empty-object-type': 'off',
      'import/no-anonymous-default-export': 'off',
      'prefer-const': 'off',
    },
  },
]

export default eslintConfig
