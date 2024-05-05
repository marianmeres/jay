import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Forbidden } from '../../src/utils/errors.js';
import { Api } from '../../src/services/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const suite = new TestRunner(path.basename(__filename));

suite.test('parseBearerToken works', () => {
	assert(!Api.parseBearerToken(void 0));
	assert(!Api.parseBearerToken(''));
	assert(Api.parseBearerToken('bearer foo bar baz ') === 'foo bar baz');
});

suite.test('has access works', async () => {
	// const project = Project.factory('test');
	const project: any = {
		store: {
			access: {
				foo: {
					public: {
						create: false,
					},
					authenticated: {
						create: true,
					},
				},
			},
		},
	};

	// config exists
	await assert.rejects(
		() => Api.assertHasAccess('foo', 'public', Api.ACTION_CREATE, project),
		Forbidden
	);

	// wrong entity
	await assert.rejects(
		() => Api.assertHasAccess('wrong', 'public', Api.ACTION_CREATE, project),
		Forbidden
	);

	// wrong identity type
	await assert.rejects(
		() => Api.assertHasAccess('foo', 'unknown', Api.ACTION_CREATE, project),
		Forbidden
	);

	// wrong action
	await assert.rejects(
		() => Api.assertHasAccess('foo', 'public', 'wrong', project),
		Forbidden
	);

	// all good
	await assert.doesNotReject(() =>
		Api.assertHasAccess('foo', 'authenticated', Api.ACTION_CREATE, project)
	);
});

export default suite;
