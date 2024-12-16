// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylisticTs from '@stylistic/eslint-plugin-ts';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.strict,
    stylisticTs.configs['all-flat'],
    {
        rules: {
            '@stylistic/ts/indent': ['error', 4],
            '@stylistic/ts/semi': ['error', 'always'],
            '@stylistic/ts/comma-dangle': ['error', 'always-multiline'],
            '@stylistic/ts/quotes': ['error', 'single'],
            '@stylistic/ts/quote-props': ['error', 'as-needed'],
            '@stylistic/ts/no-extra-parens': ['off'],
            '@stylistic/ts/member-delimiter-style': ['error', {
                multiline: {
                    delimiter: 'semi',
                },
                singleline: {
                    delimiter: 'comma',
                    requireLast: false,
                },
            }],
        },
    },
);
