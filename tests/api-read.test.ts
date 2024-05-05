import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { get, post } from 'httpie';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Config } from '../src/config.js';
import { ROUTE } from '../src/lib/api-server.js';
import { STATUS } from '../src/lib/constants.js';
import { Api } from '../src/services/api.js';
import { modelUid } from '../src/utils/uuid.js';
import {
	API,
	API_CMS,
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
		await TestUtil.cleanUpTestModels();
		await TestUtil.createTestUserJsonFile(null, true);
		await TestUtil.createFooJsonFile(true);
	},
	after: async () => {
		await TestUtil.cleanUpTestModels();
		await TestUtil.removeTestUserJsonFile(true);
	},
});

suite.test('get schema', async () => {
	// acquire token
	const { data } = await post(API + ROUTE.AUTH, { body: correct });
	const r = await get(API + ROUTE.SCHEMA, {
		headers: { ...Api.authBearer(data.token) },
	});
	const entity = Config.ENTITY_TEST;

	assert(r.data.definitions[entity].$id === `#/definitions/${entity}`);

	//
	assert(r.data.definitions[entity].properties.name);
	assert(r.data.definitions[entity].properties._special);

	// hidden in clientMode (api request)
	assert(!r.data.definitions[entity].properties.__hidden);
	assert(!r.data.definitions[entity].properties.__password);

	assert(r.data.definitions[entity]._order === 9999);
});

suite.test('get collection and model respects access config', async () => {
	// initially must be empty
	let r = await get(API_ENT_TEST);
	assert(Array.isArray(r.data));

	// any id requests throws 404
	await TestUtil.assertStatus(STATUS.NOT_FOUND, get(`${API_ENT_TEST}/${modelUid()}`));

	// create by hand
	const id = await TestUtil.createTestModelJsonFile({ name: 'james' }, true);

	const pickById = (r) => r.data.filter((v) => v.id === id)[0];

	// now not empty
	r = await get(API_ENT_TEST);
	assert(r.data.length === 2);
	assert(pickById(r).name === 'james');

	// fetch exact model
	r = await get(`${API_ENT_TEST}/${id}`);
	assert(r.data.id === id);
	assert(r.data.name === 'james');

	// now disable "read_all"
	const rr = await TestUtil.hackAccessFor(Config.ENTITY_TEST, {
		public: { read_all: false },
	});
	assert(!rr.access[Config.ENTITY_TEST].public.read_all, 'Access hack unsucessfull');

	// and collection throws forbidden
	await TestUtil.assertStatus(STATUS.FORBIDDEN, get(API_ENT_TEST));

	// but model is stil accessible
	r = await get(`${API_ENT_TEST}/${id}`);
	assert(r.data.id === id);

	// now disable "read_one" as well
	await TestUtil.hackAccessFor(Config.ENTITY_TEST, { public: { read_one: false } });
	await TestUtil.assertStatus(STATUS.FORBIDDEN, get(`${API_ENT_TEST}/${id}`));
});

suite.test('unknown collection returns 404', async () => {
	let rnd = 'entity-' + Math.random().toString().substr(2, 5);
	await TestUtil.assertStatus(STATUS.NOT_FOUND, get(`${API_CMS}/${rnd}`));
	await TestUtil.assertStatus(STATUS.NOT_FOUND, get(`${API_CMS}/${rnd}/123`));
});

suite.test('authenticated access over public works', async () => {
	await TestUtil.hackAccessFor(Config.ENTITY_TEST, {
		public: { read_all: false },
		authenticated: { read_all: true },
	});
	// public forbidden
	await TestUtil.assertStatus(STATUS.FORBIDDEN, get(`${API_ENT_TEST}`));

	// acquire token
	const { data } = await TestUtil.assertStatus(
		STATUS.OK,
		post(API + ROUTE.AUTH, { body: correct })
	);

	// public still forbidden
	await TestUtil.assertStatus(STATUS.FORBIDDEN, get(`${API_ENT_TEST}`));

	// with token OK
	await TestUtil.assertStatus(
		STATUS.OK,
		get(`${API_ENT_TEST}`, {
			headers: { ...Api.authBearer(data.token) },
		})
	);
});

export default suite;
