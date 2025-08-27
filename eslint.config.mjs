import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores([
        '**/static/**/*',
        'packages/server/assets/homepage.js',
        'packages/server/assets/ingame.js',
        'packages/server/assets/vue.js'
    ]),
    {
        extends: compat.extends('standard', 'plugin:prettier/recommended'),

        plugins: {
            '@typescript-eslint': typescriptEslint
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 6,
            sourceType: 'module'
        },

        rules: {
            semi: ['error', 'always'],
            'no-var': 'error',
            'no-unused-vars': 'off',
            'guard-for-in': 'error',

            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    args: 'after-used',
                    ignoreRestSiblings: true,
                    argsIgnorePattern: '^_'
                }
            ],

            'prefer-const': [
                'error',
                {
                    destructuring: 'all'
                }
            ],

            'standard/no-callback-literal': 'off'
        }
    },
    {
        files: ['**/*.ts'],

        rules: {
            'no-undef': 'off',
            'no-redeclare': 'off',
            '@typescript-eslint/no-redeclare': ['error'],
            'no-use-before-define': 'off',
            'guard-for-in': 'off'
        }
    },
    {
        files: ['**/*.d.ts'],

        rules: {
            'no-useless-constructor': 'off',
            '@typescript-eslint/no-unused-vars': 'off'
        }
    }
]);
