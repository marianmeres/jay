import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import _ from 'lodash';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Config } from '../config.js';
import { Cms } from './cms.js';
import { Project } from './project.js';
import { TestUtil } from '../__tests__/_test-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const suite = new TestRunner(path.basename(__filename), {
	beforeEach: async () => {
		await TestUtil.createFooJsonFile(true);
	},
	// after: schemaService.resetState,
});

suite.test('reading master defaults works', async () => {
	const masterDefaults = await Cms.getInternalDefaults();
	['_access', '_schema', '_schema_property_template', '_meta'].forEach((k) => {
		assert(masterDefaults[k], `Expected key ${k} not found`);
	});
});

suite.test('reading cms data files for further processing works', async () => {
	const { dataDir } = Project.getEnvConfig('test');
	const raw = await Cms.readCmsRawData(dataDir);
	['_defaults', '_models', '_configs'].forEach((k) => {
		assert(raw[k], `Expected key ${k} not found`);
	});
});

suite.test('cms files are picked and sorted correctly', async () => {
	const { dataDir } = Project.getEnvConfig('test');
	const raw = await Cms.readCmsRawData(dataDir);
	const store = await Cms.createStore(raw, false);

	for (let type of ['models', 'schemas', 'access', 'meta']) {
		for (let entity of [Config.ENTITY_USER, Config.ENTITY_TEST]) {
			const v = _.at(store as any, `${type}.${entity}`)[0];
			assert(v, `Missing value in cms store ${type}.${entity}`);
			if (['models', 'schemas'].includes(type)) {
				assert(!_.isEmpty(v), `Entry not found ${type}.${entity}`);
			}
		}
	}
});

suite.test('entity exists check works', async () => {
	const { dataDir } = Project.getEnvConfig('test');
	const raw = await Cms.readCmsRawData(dataDir);
	const store = await Cms.createStore(raw, false);

	assert(await Cms.entityExists(Config.ENTITY_TEST, store), 'Entity test should exist');
	assert(!(await Cms.entityExists('foooooo', store)));
});

suite.test('cms project store shortcut works', async () => {
	const project = await Project.factory('test');
	assert(
		await Cms.entityExists(Config.ENTITY_TEST, project.store),
		'Entity test should exist'
	);
});

suite.test('get entity filename works', async () => {
	const project = await Project.factory('test');
	const filename = await Cms.getEntityFilename(Config.ENTITY_TEST, 'some-id', project);
	assert(/.+\/some-id\.json$/.test(filename));
});

export default suite;
