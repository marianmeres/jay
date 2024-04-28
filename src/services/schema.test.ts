import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import _ from 'lodash';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { InvalidModel, InvalidSchema, Schema } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exampleSchema = {
	$id: 'example',
	type: 'object',
	properties: {
		id: {
			type: 'integer',
			_html: { some: 'foo' },
		},
	},
	required: ['id'],
};

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: () => {
		Schema.resetState();
		return { schema: exampleSchema };
	},
	after: Schema.resetState,
});

suite.test('invalid schema throws', () => {
	assert.throws(() => Schema.getValidator({ properties: 123 }), InvalidSchema);
	assert.throws(() => Schema.validateSchema({ properties: 123 }), InvalidSchema);

	const s = { type: 'object' };
	assert(s === Schema.validateSchema(s), 'Must return schema');
});

suite.test('schema validation is cached', () => {
	const s = { type: 'object' };
	const s2 = { type: 'number' };

	const v = Schema.getValidator(s);
	const v1 = Schema.getValidator(s);
	assert.deepStrictEqual(v, v1);

	const v2 = Schema.getValidator(s2);
	assert.notDeepStrictEqual(v, v2);
});

suite.test('validate works', ({ schema }) => {
	assert.throws(
		() => Schema.validate(schema, 123),
		InvalidModel,
		'Must throw by default'
	);
	assert(
		Schema.validate(schema, 123, false) === false,
		'Must not throw if assert param is false'
	);

	const model = { id: 123 };
	assert.doesNotThrow(() => Schema.validate(schema, model));
	assert(model === Schema.validate(schema, model));
});

suite.test('validate string with null type', () => {
	const schema = {
		$id: 'example',
		type: 'object',
		properties: {
			id: {
				type: 'integer',
			},
			foo: {
				type: ['string', 'null'],
			},
		},
	};
	const model = { id: 123, foo: null };

	assert.doesNotThrow(() => Schema.validate(schema, model));
	assert(model === Schema.validate(schema, model));
});

suite.test('validate with object type', () => {
	const schema = {
		$id: 'example',
		type: 'object',
		properties: {
			id: {
				type: 'integer',
			},
			foo: {
				type: 'object',
			},
		},
		required: ['id'],
	};
	const model: any = { id: 123, foo: { bar: 'baz', hey: { ho: { a: 123 } } } };

	assert.doesNotThrow(() => Schema.validate(schema, model));
	assert(model === Schema.validate(schema, model));

	//
	model.foo = 'bar';
	assert.throws(() => Schema.validate(schema, model));
});

suite.test('array of enums', () => {
	const schema = {
		$id: 'example',
		type: 'object',
		properties: {
			id: {
				type: 'integer',
			},
			foo: {
				type: 'array',
				items: {
					type: 'string',
					enum: ['one', 'two', 'three'],
				},
			},
		},
		required: ['id'],
	};

	const model: any = { id: 123, foo: ['one', 'one'] };
	assert.doesNotThrow(() => Schema.validate(schema, model));

	model.foo.push('four');
	assert.throws(() => Schema.validate(schema, model));
});

suite.test('array of regexed enums', () => {
	const schema = {
		$id: 'example',
		type: 'object',
		properties: {
			id: {
				type: 'integer',
			},
			foo: {
				type: 'array',
				items: {
					type: 'string',
					pattern: '^test/[A-F0-9-]+$',
				},
			},
		},
		required: ['id'],
	};

	const model: any = { id: 123, foo: ['test/1', 'test/2'] };
	assert.doesNotThrow(() => Schema.validate(schema, model));

	model.foo.push('test/');
	assert.throws(() => Schema.validate(schema, model));
});

suite.test('build complex schema', async ({ schema }) => {
	const example1 = { ...schema };

	const example2 = _.merge({}, schema, {
		$id: 'example2',
		// add new props: a) $ref, b) __hidden
		properties: { foo: { $ref: '#/example' }, __hidden: { type: 'string' } },
	});

	let s = Schema.buildDefinitionsSchema([example1, example2]);
	assert(s.definitions, 'Missing top level definitions');
	assert(s.definitions.example, 'Missing definitions entity');
	assert(s.definitions.example2, 'Missing definitions entity');
	assert(s.definitions.example.$id === '#/definitions/example');
	assert(s.definitions.example2.$id === '#/definitions/example2');
	assert(
		_.isEqual(_.omit(example1, ['$id']), _.omit(s.definitions.example, ['$id'])),
		'original schema doesnt match with embeded definition'
	);

	// check if $ref was correctly modified
	const de2 = s.definitions.example2;
	assert(
		de2.properties.foo.$ref === '#/definitions/example',
		`wrong $ref: ${de2.properties.foo.$ref}`
	);

	// generated schema must be valid
	Schema.getValidator(s);

	// in client mode, double underscored keys must not be present
	assert(!s.definitions.example2.properties.__hidden);

	// but not with false flag
	s = Schema.buildDefinitionsSchema([example1, example2], false);
	assert(s.definitions.example2.properties.__hidden.type === 'string');
});

export default suite;
