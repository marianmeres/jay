import dotenv from 'dotenv';
dotenv.config();

import { TestRunner } from '@marianmeres/test-runner';
import { gray, red } from 'kleur/colors';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { Config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// prettier-ignore
if (process.env.NODE_ENV === 'production') {
	console.log(red("ERROR: 'production' env detected. Tests will not run!"));
	console.log(gray(`(To override, use: 'NODE_ENV=testing node ${path.basename(__filename)}'`));
	process.exit(1);
}
process.env.NODE_ENV = 'testing';

const args = process.argv.slice(2);
const verbose = args.includes('-v');
const whitelist = args.filter((v) => !/^-v$/.test(v));

TestRunner.runAll(__dirname, {
	whitelist,
	verbose,
	rootDir: __dirname,
	context: Config,
	enableErrorsSummaryOnNonVerbose: true,
});
