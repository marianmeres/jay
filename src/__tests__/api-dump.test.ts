import { createClog } from '@marianmeres/clog';
import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { get } from 'httpie';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ROUTE } from '../lib/api-server.js';
import { STATUS } from '../lib/constants.js';
import { API, TEST_USER_EMAIL, TEST_USER_PASSWORD, TestUtil } from './_test-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clog = createClog('api-dump.test');

const correct = { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD };

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: async () => {
		TestUtil.cleanUpTestModels();
		await TestUtil.createTestUserJsonFile(null, true);
		await TestUtil.createFooJsonFile(true);
	},
	after: async () => {
		TestUtil.cleanUpTestModels();
		await TestUtil.removeTestUserJsonFile(true);
	},
});

suite.test('dump works', async () => {
	const r = await TestUtil.assertStatus(STATUS.OK, get(API + ROUTE.DUMP));
	assert(!Object.keys(r.data).includes('_user'));
	assert(Object.keys(r.data).includes('test'));
	assert(r.data.test.foo); // id based map
});

export default suite;
