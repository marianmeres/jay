import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { del, get, post } from 'httpie';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { STATUS } from '../src/lib/constants.js';
import { API_ENT_TEST, TestUtil } from './_test-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: async () => {
		await TestUtil.cleanUpTestModels();
		await TestUtil.refreshCache();
	},
	after: async () => {
		await TestUtil.cleanUpTestModels();
		await TestUtil.refreshCache();
	},
});

suite.test('delete non existing fails as not found', async () => {
	await TestUtil.assertStatus(STATUS.NOT_FOUND, del(`${API_ENT_TEST}/123`));
});

suite.test('delete works', async () => {
	// create
	let r = await TestUtil.assertStatus(
		STATUS.CREATED,
		post(API_ENT_TEST, { body: { name: 'hoho' } })
	);
	const url = `${API_ENT_TEST}/${r.data.id}`;

	// make sure it exists
	await TestUtil.assertStatus(STATUS.OK, get(url));

	// now delete
	r = await TestUtil.assertStatus(STATUS.NO_CONTENT, del(url));
	assert(r.data === ''); // no content

	// make sure it doesn't exist any more
	await TestUtil.assertStatus(STATUS.NOT_FOUND, get(url));
});

export default suite;
