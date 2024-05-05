import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import bcrypt from 'bcrypt';
import fs from 'fs';
import _ from 'lodash';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TestModel, TestUtil } from '../_test-util.js';
import { Config } from '../../src/config.js';
import { delay } from '../../src/utils/fns.js';
import { Cms } from '../../src/services/cms.js';
import { Crud } from '../../src/services/crud.js';
import { Project } from '../../src/services/project.js';
import { Schema } from '../../src/services/schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: async () => {
		TestUtil.cleanUpTestModels();
		await TestUtil.createFooJsonFile(true);
	},
	after: () => {
		TestUtil.cleanUpTestModels();
	},
});

suite.test('crud factory repo sanity check', async () => {
	const project = await Project.factory('test');
	const repo = await Crud.factoryRepository(Config.ENTITY_TEST, project);

	// @see cms-data-test/test/foo.json
	const m = await repo.findOne('foo');
	// console.log(m);
	assert(m.name === 'bar');
	assert(m._created_at); // toto pre 'foo' existuje iba v memory
});

suite.test('crud repo writer test insert', async () => {
	const project = await Project.factory('test');
	const schema = await Schema.getSchema(project, Config.ENTITY_TEST);
	const repo = await Crud.factoryRepository<TestModel>(
		Config.ENTITY_TEST,
		project,
		undefined,
		false
	);

	const m = await repo.save({ name: 'kokosovič' });
	assert(m.id);
	assert(m._created_at);
	assert(m._updated_at);
	assert(m.__hidden);

	const filename = await Cms.getEntityFilename(Config.ENTITY_TEST, m.id, project);
	const loaded = await Cms.readAndParseJsonFile(filename);
	assert(_.isEqual(m, loaded), 'memory vs written model mismatch');

	//
	assert(project.store.models[Config.ENTITY_TEST][m.id], 'Model not written in store');
});

suite.test('crud repo writer test update', async () => {
	const project = await Project.factory('test');
	const schema = await Schema.getSchema(project, Config.ENTITY_TEST);
	const repo = await Crud.factoryRepository<TestModel>(
		Config.ENTITY_TEST,
		project,
		null,
		false
	);

	let m = await repo.save({ name: 'kokosovič' });

	await delay(10);

	m.name = 'fuj';
	m = await repo.save(m);

	assert(m.name === 'fuj');
	assert(m._created_at);
	assert(m._updated_at);
	assert(m._created_at !== m._updated_at);

	const filename = await Cms.getEntityFilename(Config.ENTITY_TEST, m.id as any, project);
	const loaded = await Cms.readAndParseJsonFile(filename);
	assert(_.isEqual(m, loaded), 'memory vs written model mismatch');
});

suite.test('delete works', async () => {
	const project = await Project.factory('test');
	const schema = await Schema.getSchema(project, Config.ENTITY_TEST);
	const repo = await Crud.factoryRepository<TestModel>(
		Config.ENTITY_TEST,
		project,
		undefined,
		false
	);

	let m = await repo.save({ name: 'hey' });
	const mid = m.id as string;
	let r = await repo.delete(mid);

	assert(!project.store.models[Config.ENTITY_TEST][mid], 'Model not removed from store');
	assert(
		!fs.existsSync(await Cms.getEntityFilename(Config.ENTITY_TEST, mid, project)),
		'Model file not deleted'
	);
});

suite.test('password is created correctly', async () => {
	const project = await Project.factory('test');
	const schema = await Schema.getSchema(project, Config.ENTITY_TEST);
	const repo = await Crud.factoryRepository<TestModel>(
		Config.ENTITY_TEST,
		project,
		undefined,
		false
	);

	let m = await repo.save({ name: 'hey', __password: 'ho' });
	assert(await bcrypt.compare('ho', m.__password as any));
});

suite.test('crud allows setting of underscored props', async () => {
	const project = await Project.factory('test');
	const schema = await Schema.getSchema(project, Config.ENTITY_TEST);
	const repo = await Crud.factoryRepository<TestModel>(
		Config.ENTITY_TEST,
		project,
		undefined,
		false
	);

	// toto ja zakazatelne iba z urovne requestu
	let m = await repo.save({ name: 'hey', _special: '123456' });
	assert(m._special === '123456');
});

suite.test('_unique check works', async () => {
	const project = await Project.factory('test');
	const repo = await Crud.factoryRepository<TestModel>(
		Config.ENTITY_TEST,
		project,
		undefined,
		false
	);

	let existing = await repo.findOne('foo');

	// name je definovane ako _unique a ma _transform lowercase
	let { name } = existing;
	await assert.rejects(
		() => repo.save({ name: name.toUpperCase() }),
		'Should have thrown on not being unique'
	);

	// ale savenut sameho seba musi ist
	existing.switch = !existing.switch;
	await repo.save(existing);
});

export default suite;
