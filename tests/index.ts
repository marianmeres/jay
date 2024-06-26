import path from 'node:path';
import { TestRunner } from '@marianmeres/test-runner';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const verbose = args.includes('-v');
const whitelist = args.filter((v) => !/^-v$/.test(v));

console.clear();

TestRunner.runAll(__dirname, {
	whitelist,
	verbose,
	rootDir: __dirname,
	enableErrorsSummaryOnNonVerbose: true,
}).then();
