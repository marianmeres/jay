import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TEST_USER_PASSWORD, TestUtil } from './_test-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: () => ({ user: TestUtil.createTestUser() }),
});

suite.test('test user password sanity check', async ({ user }) => {
	assert(await bcrypt.compare(TEST_USER_PASSWORD, user.__password));
});

suite.test('hash password sanity check', async () => {
	const password = 'foooo';
	const hashed = bcrypt.hashSync(password, 10);
	assert(!(await bcrypt.compare('wrong', hashed)));
	assert(await bcrypt.compare(password, hashed));
});

export default suite;
