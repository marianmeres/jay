import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { modelUid } from './uuid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suite = new TestRunner(path.basename(__filename));

suite.test('Model uids are generated correctly', () => {
	// xxxx-xxxx-xxxx-xxxx
	assert(/^[^-]{4}-[^-]{4}-[^-]{4}-[^-]{4}$/.test(modelUid()));
});

export default suite;
