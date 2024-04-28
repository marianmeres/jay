import Ajv from 'ajv';
import { NotFound } from '../utils/errors.js';
import { Project } from './project.js';

export class InvalidSchema extends Error {}

export class InvalidModel extends Error {}

const _createValidator = (schema) => {
	const ajv = new (Ajv as any)({ strict: false, validateFormats: false });
	ajv.addVocabulary(['_html', '_default', '_transform', '_order', '_unique']);
	return ajv.compile(schema);
};

const _validators = new Map();

const _validateErrorsToString = (errors) =>
	(errors || [])
		.reduce((memo, e) => {
			memo.push(`${e.schemaPath} ${e.message} ${JSON.stringify(e.params)}`);
			return memo;
		}, [])
		.join(', ');

const _undefFallback = (val, fallback) => (val === void 0 ? fallback : val);

export class Schema {
	static async getSchema(
		project: Project,
		entity?,
		{
			assert,
			clientMode,
		}: Partial<{
			assert: boolean;
			clientMode: boolean;
		}> = {}
	) {
		// option defaults
		assert = _undefFallback(assert, true);
		clientMode = _undefFallback(clientMode, true);

		// feature: if no entity specified return complex
		if (!entity) {
			return Schema.buildDefinitionsSchema(
				Object.values(project.store.schemas),
				clientMode
			);
		}

		const s = project.store.schemas[entity];
		if (assert && !s) {
			throw new NotFound();
		}
		return s;
	}

	// should not really be needed to call from the outside
	static getValidator(schema) {
		if (_validators.has(schema)) {
			return _validators.get(schema);
		}
		try {
			const v = _createValidator(schema);
			_validators.set(schema, v);
			return v;
		} catch (e) {
			throw new InvalidSchema(e.toString().replace(/^(Error: )/, ''));
		}
	}

	/**
	 * @param schema
	 */
	static validateSchema(schema) {
		Schema.getValidator(schema);
		return schema;
	}

	/**
	 * @param schema
	 * @param data
	 * @param assert
	 */
	static validate(schema, data, assert = true) {
		const validate = Schema.getValidator(schema);
		const valid = validate(data);

		if (valid) return data;

		if (assert) {
			throw new InvalidModel(_validateErrorsToString(validate.errors));
		}

		return false;
	}

	/**
	 * Will try to build one parent "definitions" schema from multiple child ones...
	 * Quick-n-dirty... expects conventional $id in the form: '#/entity'
	 *
	 * @param from
	 * @param clientMode
	 * @param title
	 */
	static buildDefinitionsSchema(from: object[], clientMode = true, title?) {
		let definitions: { [name: string]: any } = {};

		const _customize = (o) =>
			JSON.parse(
				JSON.stringify(o, (key, value) => {
					// omit double-underscored __fields (application convention)
					// UPDATE: po novom davam pristup na schemu iba ako authenticated...
					// cim sa parameter `clientMode` stava mozno zbytocnym... nicmenej, nechavam
					if (clientMode && key.startsWith('__')) {
						value = void 0;
					}
					// prefix each $ref with 'definitions'
					else if (key === '$ref') {
						value = value.replace(/^(#\/)/, '#/definitions/');
					}
					return value;
				})
			);

		from.forEach((s: any) => {
			if (!s.$id) {
				throw new Error('Unable to build definitions from schema without $id param');
			}
			// conventions id prefix cleanup (to be added later)
			const name = s.$id.replace(/^(#\/)/, '');
			definitions[name] = {
				..._customize(s),
				...{ $id: `#/definitions/${name}` },
			};
		});

		return {
			$schema: 'http://json-schema.org/draft-07/schema#',
			title,
			type: 'object',
			definitions,
		};
	}

	/**
	 *
	 */
	static resetState() {
		_validators.clear();
	}
}
