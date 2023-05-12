import * as fs from 'fs';
import { assert, describe, test } from 'vitest';
import { compile } from '../../../compiler.mjs';
import { tryToLoadJson } from '../../helpers.js';

describe('vars', () => {
	fs.readdirSync(`${__dirname}/samples`).forEach((dir) => {
		if (dir[0] === '.') return;

		// add .solo to a sample directory name to only run that test
		const solo = /\.solo/.test(dir);
		const skip = /\.skip/.test(dir);

		const desc = solo ? describe.only : skip ? describe.skip : describe;

		desc(dir, () => {
			test.each(['dom', 'ssr', false])(`generate: %s`, async (generate) => {
				const filename = `${__dirname}/samples/${dir}/input.svelte`;
				const input = fs.readFileSync(filename, 'utf-8').replace(/\s+$/, '');
				const expectedError = tryToLoadJson(`${__dirname}/samples/${dir}/error.json`);

				/**
				 * @type {{ options: any, test: (assert: typeof assert, vars: any[]) => void }}}
				 */
				const { options, test } = (await import(`./samples/${dir}/_config.mjs`)).default;

				try {
					const { vars } = compile(input, { ...options, generate });
					test(assert, vars);
				} catch (error) {
					if (expectedError) {
						assert.equal(error.message, expectedError.message);
						assert.deepEqual(error.start, expectedError.start);
						assert.deepEqual(error.end, expectedError.end);
						assert.equal(error.pos, expectedError.pos);
					} else {
						throw error;
					}
				}

				if (expectedError) {
					assert.fail(`Expected an error: ${JSON.stringify(expectedError)}`);
				}
			});
		});
	});
});
