import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import _ from 'lodash';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { ModelLike, Repository } from '../../src/utils/repository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = [
	{ id: '1', name: 'foo', _created_at: 40 },
	{ id: '2', name: 'bar', _created_at: 30 },
	{ id: '3', name: 'baz', _created_at: 20 },
	{ id: '4', name: 'bat', _created_at: 10 },
];
const storage = models.reduce((memo, m) => ({ ...memo, [m.id]: m }), {});

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: () => ({ storage }),
});

suite.test('insert, count, findOne', async () => {
	const repo = new Repository({ entity: 'foo' });

	assert((await repo.count()) === 0);
	assert((await repo.exists('1')) === false);

	let model = await repo.insert(models[0]);

	assert((await repo.count()) === 1);
	assert((await repo.exists(model.id)) === true);
	assert((await repo.exists('wrong')) === false);

	// same insert must fail
	await assert.rejects(() => repo.insert(models[0]));

	let model2 = await repo.insert(models[1]);
	assert((await repo.count()) === 2);

	let found = await repo.findOne(model2.id);
	assert(found.name === model2.name);

	// same findOne but with different syntax
	found = await repo.findOne({ id: model2.id });
	assert(found.name === model2.name);

	// find by other than id
	found = await repo.findOne({ name: model2.name });
	assert(found.name === model2.name);

	// not found
	found = await repo.findOne('asdf');
	assert(!found);

	// missing where param must fail
	await assert.rejects(() => repo.findOne(void 0));
});

suite.test('update, save', async ({ storage }) => {
	const repo = new Repository({ entity: 'foo', storage });
	assert((await repo.count()) === 4);

	let updated = await repo.update({ id: '3', name: 'čuramedán', hey: 'ho' });
	let found = await repo.findOne('3');
	assert(updated === found);

	let fresh: any = { id: '123', name: 'amen' };

	// non-existing update must fail
	await assert.rejects(() => repo.update(fresh));

	//
	let saved = await repo.save(fresh);
	assert(saved === fresh);

	// console.log(await repo.dump());
});

suite.test('fetchAll', async ({ storage }) => {
	const repo = new Repository({ entity: 'foo', storage });
	assert((await repo.count()) === 4);

	let all = (await repo.findAll((m) => /^b/i.test(m.name))).rows;
	assert(all.length === 3);

	// komparator zoraduje defaultne podla '_created_at' a data su umyselne naplnene
	// ako desc... takze:
	assert(all[0].id === '4');
	assert(all[1].id === '3');
	assert(all[2].id === '2');

	all = (await repo.findAll({ name: 'foo' })).rows;
	assert(all.length === 1);
});

suite.test('fetchAll with no argument', async ({ storage }) => {
	const repo = new Repository({ entity: 'foo', storage });
	assert((await repo.findAll()).rows.length === 4);
});

suite.test('modify storage from outside', async () => {
	const externalStorage = {};
	models.forEach((m) => m.id && (externalStorage[m.id] = m));
	const repo = new Repository({ entity: 'foo', storage: externalStorage });

	// normalne funguje
	assert(await repo.findOne('1'));
	assert((await repo.count()) === 4);

	// manipulate storage
	delete externalStorage['1'];
	externalStorage['2'].name = 'jarabina';

	//
	assert(!(await repo.findOne('1')));
	assert((await repo.count()) === 3);
	assert((await repo.findOne('2')).name === 'jarabina');
});

suite.test('write via storage proxy', async ({ storage }) => {
	const filesystem = {}; // ha

	// toto je v teorii pekne, ale kedze zapis bude v realite asynchronny a pri faily
	// chceme failovat, tak toto nebude velmi pouzitelne...
	storage = new Proxy(storage, {
		set: function (obj, prop, value) {
			obj[prop] = value;
			// educated quess that we're saving
			if (value && value.id && value.id === prop) {
				filesystem[value.id] = JSON.stringify(value);
			}
			return true;
		},
	});

	//
	const repo = new Repository<ModelLike>({ entity: 'foo', storage });

	const m = { id: '123' };
	assert(m === (await repo.save(m)));
	assert(filesystem['123'] === '{"id":"123"}', 'Object did not write correctly');
});

suite.test('write via writer', async ({ storage }) => {
	const filesystem = {}; // ha

	const repo = new Repository<ModelLike>({
		entity: 'foo',
		storage,
		writer: async (m) => {
			filesystem[m.id] = JSON.stringify(m);
			return m;
		},
	});

	const m = { id: '123', name: 'hey' };
	assert(!(await repo.findOne(m.id)), 'Must not exist');

	// insert
	assert(m === (await repo.save(m)));
	assert(_.isEqual(JSON.parse(filesystem[m.id]), m), 'Object did not insert correctly');
	assert(_.isEqual(await repo.findOne(m.id), m), 'Object did not insert correctly');

	// update
	m.name = 'ho';
	await repo.save(m);
	assert(_.isEqual(await repo.findOne(m.id), m), 'Object did not update correctly');
});

suite.test('preCreate hook', async ({ storage }) => {
	const repo = new Repository<ModelLike>({
		entity: 'foo',
		storage,
		preCreate: async (m) => {
			m.id = 'kopanica';
			return m;
		},
	});

	const m = await repo.save({ name: 'hey' });
	assert(m.id === 'kopanica');
});

suite.test('preUpdate hook', async ({ storage }) => {
	const repo = new Repository<ModelLike>({
		entity: 'foo',
		storage,
		preUpdate: async (m) => {
			m.name = m.name.toUpperCase();
			return m;
		},
	});

	const m = await repo.save(await repo.findOne('1'));
	assert(m.name === 'FOO');
});

suite.test('preRead hook', async ({ storage }) => {
	const repo = new Repository<ModelLike>({
		entity: 'foo',
		storage,
		preRead: async (m) => {
			m.name = m.name.toUpperCase();
			return m;
		},
	});

	const m = await repo.findOne('1');
	assert(m.name === 'FOO');
});

suite.test('preDelete hook', async ({ storage }) => {
	let foo;
	const repo = new Repository<ModelLike>({
		entity: 'foo',
		storage,
		preDelete: async (m) => {
			// simulate side effect
			foo = m.id;
		},
	});

	assert(!foo);
	const m = await repo.save({ name: 'hey' });
	assert(foo === m.id);
});

export default suite;
