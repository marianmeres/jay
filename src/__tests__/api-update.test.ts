import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { patch, post } from 'httpie';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { STATUS } from '../lib/constants.js';
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

suite.test('update on non-existing must fail', async () => {
	let id = '123';
	let data: any = { name: 'chumaj', id };

	// id does not exist
	await TestUtil.assertStatus(
		STATUS.NOT_FOUND,
		patch(`${API_ENT_TEST}/${id}`, { body: data })
	);

	// id exists, but different model
	await TestUtil.assertStatus(
		STATUS.INTERNAL_SERVER_ERROR,
		patch(`${API_ENT_TEST}/foo`, { body: data })
	);
});

suite.test('update works', async () => {
	let data: any = { name: 'CHUMAJ' };

	// create
	let r = await TestUtil.assertStatus(STATUS.CREATED, post(API_ENT_TEST, { body: data }));
	assert(r.data.name === 'chumaj');
	data = r.data;

	// update
	data.name = 'KOKOS';
	r = await TestUtil.assertStatus(
		STATUS.OK,
		patch(`${API_ENT_TEST}/${data.id}`, { body: data })
	);

	// lowercase transform in action
	assert(r.data.name === 'kokos');
});

suite.test('underscored props are ignored from client request', async () => {
	const r = await TestUtil.assertStatus(
		STATUS.CREATED,
		post(API_ENT_TEST, { body: { name: 'chumaj' } })
	);
	const id = r.data.id;

	// update
	const { data } = await TestUtil.assertStatus(
		STATUS.OK,
		patch(`${API_ENT_TEST}/${id}`, {
			body: { id, name: 'foo', _special: '123' },
		})
	);

	// tu sa uistime, ze nebolo umoznene zapisat underscored prop
	assert(data._special !== '123');
	// ale _default bol aplikovany (nie je prazdna)
	assert(data._special);
});

export default suite;
