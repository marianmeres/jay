import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { post } from 'httpie';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ROUTE } from '../src/lib/api-server.js';
import { STATUS } from '../src/lib/constants.js';
import { API, TEST_USER_EMAIL, TEST_USER_PASSWORD, TestUtil } from './_test-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const correct = { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD };

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: async () => {
		await TestUtil.createTestUserJsonFile(null, true);
	},
	afterEach: async () => {
		await TestUtil.removeTestUserJsonFile(true);
	},
});

suite.test('wrong credentials are rejected', async () => {
	const wrongs = [
		{ email: 'wrong-email', password: 'wrong-pass' },
		{ email: TEST_USER_EMAIL, password: 'wrong-pass' },
		{ email: 'wrong-email', password: TEST_USER_PASSWORD },
	];

	for (let body of wrongs) {
		await TestUtil.assertStatus(STATUS.UNAUTHORIZED, post(API + ROUTE.AUTH, { body }));
	}
});

suite.test('for correct credentials token is returned', async () => {
	const { data } = await TestUtil.assertStatus(
		STATUS.OK,
		post(API + ROUTE.AUTH, { body: correct })
	);
	assert(data.token);
});

export default suite;
