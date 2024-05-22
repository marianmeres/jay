import { createClog } from '@marianmeres/clog';
import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { get, post } from 'httpie';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config } from '../src/config.js';
import { ROUTE } from '../src/lib/api-server.js';
import { STATUS } from '../src/lib/constants.js';
import { withQueryVars } from '../src/lib/with-query-vars.js';
import { Api } from '../src/services/api.js';
import { sleep } from '../src/utils/sleep.js';
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

const clog = createClog(path.basename(__filename));

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: async () => {
		await TestUtil.cleanUpTestModels();
		await TestUtil.createTestUserJsonFile(undefined, true);
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
	let r = await get(API_ENT_TEST);
	assert(Array.isArray(r.data.rows));

	// any id requests throws 404
	await TestUtil.assertStatus(STATUS.NOT_FOUND, get(`${API_ENT_TEST}/${modelUid()}`));

	// create by hand
	const id = await TestUtil.createTestModelJsonFile({ name: 'james' }, true);

	const pickById = (r) => r.data.rows.filter((v) => v.id === id)[0];

	// now not empty
	r = await get(API_ENT_TEST);

	assert(r.data.rows.length === 2);
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

suite.test('collection limit offset', async () => {
	let r = await get(API_ENT_TEST);

	for (let id = 1; id < 10; id++) {
		await sleep(50);
		// test entity is configured to allow access for public... normaly we would need auth
		let r = await TestUtil.assertStatus(
			STATUS.CREATED,
			post(API_ENT_TEST, { body: { id: `${id}`, name: `${id}` } })
		);
	}
	await TestUtil.refreshCache();

	r = await get(API_ENT_TEST);

	// 9 + 1 (foo)
	assert(r.data.rows.length === 10);
	assert(r.data.meta.total === 10);
	assert(r.data.meta.limit === 0);
	assert(r.data.meta.offset === 0);

	// sorted by _created_at desc by default
	assert(r.data.rows[0].name === '9');
	assert(r.data.rows[1].name === '8');
	assert(r.data.rows[9].name === 'bar');
	//
	r = await get(withQueryVars(API_ENT_TEST, { limit: 3 }));
	assert(r.data.rows.length === 3);
	assert(r.data.meta.total === 10);
	assert(r.data.meta.limit === 3);
	assert(r.data.meta.offset === 0);
	assert(r.data.rows[0].name === '9');
	assert(r.data.rows[1].name === '8');
	assert(r.data.rows[2].name === '7');

	//
	r = await get(withQueryVars(API_ENT_TEST, { limit: 2, offset: 5 }));
	// clog(r.data);
	assert(r.data.rows.length === 2);
	assert(r.data.meta.total === 10);
	assert(r.data.meta.limit === 2);
	assert(r.data.meta.offset === 5);
	assert(r.data.rows[0].name === '4');
	assert(r.data.rows[1].name === '3');

	//
	r = await get(withQueryVars(API_ENT_TEST, { limit: 2, offset: 100 }));
	assert(r.data.rows.length === 0);
	assert(r.data.meta.total === 10);
	assert(r.data.meta.limit === 2);
	assert(r.data.meta.offset === 100);

	//
	r = await get(withQueryVars(API_ENT_TEST, { offset: 9 }));
	// clog(r.data);
	assert(r.data.rows.length === 1);
	assert(r.data.meta.total === 10);
	assert(r.data.meta.limit === 0);
	assert(r.data.meta.offset === 9);
	assert(r.data.rows[0].name === 'bar');

	//
	r = await get(withQueryVars(API_ENT_TEST, { offset: 100 }));
	assert(r.data.rows.length === 0);

	//
	r = await get(withQueryVars(API_ENT_TEST, { limit: 100 }));
	assert(r.data.rows.length === 10);
});

suite.test('collection limit offset invalid params', async () => {
	for (let p of [
		{ limit: -1 },
		{ offset: -1 },
		{ limit: 'foo' },
		{ offset: 'bar' },
		{ limit: 'foo', offset: '-1' },
	]) {
		await TestUtil.assertStatus(
			STATUS.INTERNAL_SERVER_ERROR,
			get(withQueryVars(API_ENT_TEST, p))
		);
	}
});

suite.test('unknown collection returns 404', async () => {
	let rnd = 'entity-' + Math.random().toString().slice(2, 5);
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
