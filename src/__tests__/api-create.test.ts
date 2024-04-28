import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import fs from 'fs';
import { get, post } from 'httpie';
import _ from 'lodash';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Config } from '../config.js';
import { ROUTE } from '../lib/api-server.js';
import { STATUS } from '../lib/constants.js';
import { Api } from '../services/api.js';
import { Project } from '../services/project.js';
import {
	API,
	API_ENT_TEST,
	TEST_USER_EMAIL,
	TEST_USER_PASSWORD,
	TestUtil,
} from './_test-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const correct = { email: TEST_USER_EMAIL, password: TEST_USER_PASSWORD };

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: async () => {
		TestUtil.cleanUpTestModels();
		await TestUtil.createTestUserJsonFile(null, true);
	},
	after: async () => {
		TestUtil.cleanUpTestModels();
		await TestUtil.removeTestUserJsonFile(true);
	},
});

suite.test('schema validation and transformation work', async () => {
	const project = await Project.factory('test');
	let id = '  123  '; // will be ignored
	const data = { id, name: ' FOO   ', hey: 'ho' };

	// test entity is configured to allow access for public... normaly we would need auth
	let r = await TestUtil.assertStatus(STATUS.CREATED, post(API_ENT_TEST, { body: data }));

	// id must have been server generated and was efectivelly ignored
	assert(r.data.id !== '123');

	// model must have been correctly cached created - new fetch must not fail
	r = await TestUtil.assertStatus(STATUS.OK, get(`${API_ENT_TEST}/${r.data.id}`));
	let fetchedModel = r.data;

	// also internal storage file must exists
	const f = path.join(project.config.dataDir, Config.ENTITY_TEST, `${r.data.id}.json`);
	const m = JSON.parse(fs.readFileSync(f, 'utf8'));

	// fetched data must be the same (except those explicitly "__" not returned)
	assert(m.__hidden);
	assert(_.isEqual(_.omit(m, '__hidden'), fetchedModel));

	// check if _transforms/defaults/cleanups worked
	assert(m.name === 'foo');
	assert(m.hey === void 0);
	assert(m._special);

	// offtopic: unlink low level file (without refreshing)
	fs.unlinkSync(f);
	// model must still be outside accesible
	await TestUtil.assertStatus(STATUS.OK, get(`${API_ENT_TEST}/${m.id}`));
	// bu not after refresh
	await TestUtil.refreshCache();
	await TestUtil.assertStatus(STATUS.NOT_FOUND, get(`${API_ENT_TEST}/${m.id}`));
});

suite.test('create on existing model must fail', async () => {
	let data: any = { name: 'chumaj' };
	let r = await TestUtil.assertStatus(STATUS.CREATED, post(API_ENT_TEST, { body: data }));

	data = { ...data, id: r.data.id }; // add same id
	await TestUtil.assertStatus(
		STATUS.INTERNAL_SERVER_ERROR,
		post(API_ENT_TEST, { body: data })
	);
});

suite.test('underscored props are ignored from client request', async () => {
	let { data } = await TestUtil.assertStatus(
		STATUS.CREATED,
		post(API_ENT_TEST, { body: { name: 'chumaj', _special: '123' } })
	);
	// tu sa uistime, ze nebolo umoznene zapisat underscored prop
	assert(data._special !== '123');
	// ale _default bol aplikovany (nie je prazdna)
	assert(data._special);
});

suite.test('create auth flow works', async () => {
	let data: any = { name: 'chumaj' };

	// test entity is configured to work without auth... so we must explicitly
	// disallow
	await TestUtil.hackAccessFor(Config.ENTITY_TEST, { public: { create: false } });
	await TestUtil.assertStatus(STATUS.FORBIDDEN, post(API_ENT_TEST, { body: data }));

	// fetch token via auth req
	const { token } = (await post(API + ROUTE.AUTH, { body: correct })).data;

	let r = await TestUtil.assertStatus(
		STATUS.CREATED,
		post(API_ENT_TEST, {
			headers: { ...Api.authBearer(token) },
			body: data,
		})
	);

	assert(r.data.name === data.name);

	// now use wrong token
	await TestUtil.assertStatus(
		STATUS.FORBIDDEN,
		post(API_ENT_TEST, {
			headers: { ...Api.authBearer('wrong') },
			body: data,
		})
	);
});

export default suite;
