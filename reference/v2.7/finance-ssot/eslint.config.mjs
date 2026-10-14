// ESLint: Next's core-web-vitals and TypeScript rules (which register the jsx-a11y plugin) plus a
// stricter accessibility rule set on top. Run with `npm run lint`; the build does not run it, CI should.
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/heading-has-content': 'error',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    },
  },
  { files: ['components/ui/**'], rules: { 'jsx-a11y/click-events-have-key-events': 'off', 'jsx-a11y/no-noninteractive-element-interactions': 'off', 'jsx-a11y/label-has-associated-control': 'off' } },
  // 'out/**' is local: this project adds a static export, which the kit does not, and linting a
  // directory of minified bundles reports errors against code nobody wrote.
  { ignores: ['.next/**', 'out/**', 'node_modules/**', 'next-env.d.ts'] },
];

export default config;
