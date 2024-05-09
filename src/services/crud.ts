import { createClog } from '@marianmeres/clog';
import { parseBoolean } from '@marianmeres/parse-boolean';
import bcrypt from 'bcrypt';
import _ from 'lodash';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import slugify from 'slugify';
import { NotFound } from '../utils/errors.js';
import { ModelLike, Repository } from '../utils/repository.js';
import { modelUid, uid, uuid } from '../utils/uuid.js';
import { Cms, CmsModelJsonSchema } from './cms.js';
import { Project } from './project.js';
import { Schema } from './schema.js';
import { TokenData } from './token.js';

const clog = createClog(path.basename(fileURLToPath(import.meta.url)));

//
export class Crud {
	/**
	 * @param schema
	 * @param data
	 */
	static omitUnknownProps(schema: CmsModelJsonSchema, data: ModelLike) {
		return Object.entries(data).reduce((memo, [k, _v]) => {
			if (schema.properties[k]) {
				memo[k] = data[k];
			}
			return memo;
		}, Object.create(null));
	}

	/**
	 * @param schema
	 * @param data
	 */
	static applyTransforms(schema: CmsModelJsonSchema, data: ModelLike) {
		const isStr = (v) => typeof v === 'string';
		const transform = (name, v) => {
			// console.log(`applying tranform ${name} on ${JSON.stringify(v)}`);
			try {
				switch (`${name}`.toLowerCase()) {
					case 'none':
						return v;
					case 'trim':
						return isStr(v) ? v.trim() : v;
					case 'lowercase':
						return isStr(v) ? v.toLowerCase() : v;
					case 'uppercase':
						return isStr(v) ? v.toUpperCase() : v;
					case 'bcrypt':
						return bcrypt.hashSync(v, 10);
					case 'date-time':
						return new Date(v).toISOString();
					case 'date':
						return new Date(v).toISOString().substring(0, 'YYYY-MM-DD'.length);
					case 'boolean':
						return parseBoolean(v);
					case 'boolean-string':
						return parseBoolean(v) ? '1' : '0';
					case 'int':
						return parseInt(v);
					//	for dev hackings...
					case 'null':
						return null;
					// prettier-ignore
					case 'array-from-csv':
						return isStr(v) ? v.trim().split(',').map((v) => v.trim()).filter(Boolean) : v;
					case 'slugify':
						return isStr(v)
							? (slugify as any)(v, { lower: true, remove: /[*+~.()'"!:@]/g })
							: v;
					default:
						throw new Error(`Unknown transform value ${name}`);
				}
			} catch (e) {
				throw new Error(
					`applyTransforms... ${name}(${JSON.stringify(v)}): ${e.toString()}`
				);
			}
		};

		return Object.entries(data).reduce((memo, [k, v]) => {
			let t: any = _.at(schema, `properties.${k}._transform` as any)[0];
			if (t) {
				if (!Array.isArray(t)) t = [t];
				for (let tname of t) {
					v = transform(tname, v);
				}
			}
			memo[k] = v;
			return memo;
		}, Object.create(null));
	}

	/**
	 * @param schema
	 * @param data
	 */
	static applyDefaults(schema: CmsModelJsonSchema, data: ModelLike) {
		const apply = (name) => {
			switch (name) {
				// note: toto su iba defaulty... teda neprepisu ak existuje
				case 'id':
				case 'modelid':
					return modelUid();
				case 'uuid':
					return uuid();
				case 'uid':
					return uid();
				case 'now':
					return new Date();
				case 'today':
					return new Date().toISOString().substring(0, 'YYYY-MM-DD'.length);
				default:
					throw new Error(`Unknown default fn value ${name}`);
			}
		};

		Object.entries(schema.properties).forEach(([k, v]) => {
			let config = v._default;
			if (config && config.fn && (data[k] === null || data[k] === void 0)) {
				data[k] = apply(config.fn);
			}
		});

		return data;
	}

	// hm... toto musi byt aplikovane na urovni requestu...
	static omitUnderscored(data) {
		return _.omitBy(data, (value, key) => /^_/.test(key));
	}

	/**
	 * Toto treba aplikovat pri savenuti
	 * note: na poradi zalezi
	 * @param schema
	 * @param data
	 * @param storage
	 */
	static applyPreSaveAll(schema, data, storage?) {
		// note: na poradi moze zalezat...
		data = Crud.omitUnknownProps(schema, data);
		data = Crud.applyDefaults(schema, data);
		data = Crud.applyTransforms(schema, data);
		if (storage) {
			data = Crud.assertUnique(schema, data, storage);
		}
		return data;
	}

	/**
	 * Toto pri nacitani modelu...
	 * @param schema
	 * @param data
	 */
	static applyPreReadAll(schema, data) {
		if (!data) return data;
		return Crud.applyDefaults(schema, Crud.omitUnknownProps(schema, data));
	}

	/**
	 * @param schema
	 * @param data
	 * @param storage
	 */
	static assertUnique(schema, data, storage) {
		if (!data) return data;

		// collect unique keys
		const props = schema.properties;
		const uniqueKeys = Object.entries(props).reduce((memo, [name, meta]) => {
			// id je tu taky skaredy special case... inak by neslo updatnut vobec
			if (name !== 'id' && (meta as any)._unique) {
				memo.push(name);
			}
			return memo;
		}, []);

		const notEmpty = (v) => v !== null && v !== void 0 && v !== '';

		for (let [id, _data] of Object.entries(storage)) {
			if (data.id && id === data.id) {
				continue;
			}
			for (let k of uniqueKeys) {
				if (notEmpty(_data[k]) && notEmpty(data[k]) && _data[k] === data[k]) {
					throw new Error(
						`Value "${data[k]}" for unique property "${k}" already exists! (${JSON.stringify({ [k]: data[k] })})`
					);
				}
			}
		}

		return data;
	}

	static async factoryRepository<T extends ModelLike>(
		entity: string,
		project: Project,
		options?: Partial<{
			identity: TokenData;
		}>,
		debug = false
	) {
		const storage: any = project.store.models[entity];
		if (!storage) {
			throw new NotFound(`Entity ${entity} not found!`);
		}

		const schema = await Schema.getSchema(project, entity);

		return new Repository<T>({
			entity,
			storage,
			preRead: async (model: T) => {
				return Crud.applyPreReadAll(schema, model) as T;
			},
			preCreate: async (model: T) => {
				model = Repository.withId(model) as T;
				// do not allow userland value - applyCreateAll will
				delete model._created_at;
				model = Crud.applyPreSaveAll(schema, model, storage);

				if (options && options.identity && options.identity.id) {
					model._owner = options.identity.id;
				}

				return model;
			},
			preUpdate: async (model: T) => {
				model._updated_at = new Date();
				return Crud.applyPreSaveAll(schema, model, storage);
			},
			writer: async (model: T, meta) => {
				const { action } = meta || {};
				if (/delete/i.test(action)) {
					return await Cms.unlinkModel(entity, model.id, project);
				} else {
					await Schema.validate(schema, model);
					return await Cms.writeModel<T>(entity, model, project, debug);
				}
			},
		});
	}
}
