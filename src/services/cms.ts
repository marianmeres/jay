import { createClog } from '@marianmeres/clog';
import fs from 'fs';
import yaml from 'js-yaml';
import { bold } from 'kleur/colors';
import _ from 'lodash';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { totalist } from 'totalist';
import util from 'util';
import { Config } from '../config.js';
import { ModelLike } from '../utils/repository.js';
import { Crud } from './crud.js';
import { Project, ProjectConfig } from './project.js';
import { Schema } from './schema.js';

const clog = createClog(path.basename(fileURLToPath(import.meta.url)));

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const mkdir = util.promisify(fs.mkdir);
const unlinkFile = util.promisify(fs.unlink);
const accessFile = util.promisify(fs.access);

interface CmsAccessConfigValues {
	create: boolean;
	read_one: boolean;
	read_all: boolean;
	update: boolean;
	delete: boolean;
}

interface CmsAccessConfig {
	public: CmsAccessConfigValues;
	authenticated: CmsAccessConfigValues;
}

export interface CmsModelJsonSchema {
	$schema: string;
	$id: string;
	type: string;
	description: string;
	required: string[];
	properties: {
		[name: string]: Partial<CmsModelPropertySchema>;
	};
}

export interface CmsModelPropertySchema {
	type: string;
	_html: Partial<{
		readonly: boolean;
		required: boolean;
	}>;
	_default: any;
	_transform: string[];
	_unique: boolean;
	_order: number;
}

interface CmsInternalMetaConfig {
	write_target: string;
}

interface CmsInternalDefaults {
	_access: CmsAccessConfig;
	_schema: CmsModelJsonSchema;
	_schema_property_template: Partial<CmsModelPropertySchema>;
	_meta: Partial<CmsInternalMetaConfig>;
}

interface CmsInternalRawData {
	_defaults: Partial<CmsInternalDefaults>;
	_models: {
		[entity: string]: {
			[id: string]: ModelLike;
		};
	};
	_configs: {
		[entity: string]: Partial<CmsInternalDefaults>;
	};
}

export interface CmsEntityMap {
	[entity: string]: {
		[id: string]: ModelLike;
	};
}

export interface CmsAccessMap {
	[entity: string]: CmsAccessConfig;
}

export interface CmsSchemaMap {
	[entity: string]: CmsModelJsonSchema;
}

export interface CmsMetaMap {
	[entity: string]: Partial<CmsInternalMetaConfig>;
}

export interface CmsStore {
	schemas: CmsSchemaMap;
	models: CmsEntityMap;
	access: CmsAccessMap;
	meta: CmsMetaMap;
}

export class Cms {
	static async entityExists(entity: string, store: CmsStore): Promise<boolean> {
		return !!store.schemas[entity];
	}

	static async readAndParseJsonFile(file, assert = true) {
		try {
			return JSON.parse(await readFile(file, 'utf8'));
		} catch (e) {
			if (assert) {
				throw new Error(`Unable to parse json ${file}`);
			}
		}
		return null;
	}

	static async readAndParseYamlFile(file, assert = true) {
		try {
			return yaml.load(await readFile(file, 'utf8'));
		} catch (e) {
			if (assert) {
				throw new Error(`Unable to parse yaml ${file} ... ` + e.toString());
			}
		}
		return null;
	}

	static async getEntityWriteTargetDirectory(
		entity: string,
		project: Project
	): Promise<string> {
		return path.join(project.config.dataDir, entity);
	}

	static async getEntityFilename(entity, id: string, project: Project) {
		const dir = await Cms.getEntityWriteTargetDirectory(entity, project);
		return path.join(dir, `${id}.json`);
	}

	static async writeModel<T extends ModelLike>(
		entity: string,
		model: T,
		project: Project,
		debug = false
	): Promise<T> {
		const dir = await Cms.getEntityWriteTargetDirectory(entity, project);

		// try to create dir if not exists...
		try {
			await accessFile(dir);
		} catch (e) {
			if (e.code !== 'ENOENT') throw e;
			await mkdir(dir, { recursive: true });
		}

		const filename = await Cms.getEntityFilename(entity, model.id, project);
		debug && clog.debug(`Writing model to ${filename}`);
		await writeFile(filename, JSON.stringify(model, null, '\t'));
		return model;
	}

	static async unlinkModel(entity, id, project: Project, debug = false) {
		const filename = await Cms.getEntityFilename(entity, id, project);
		debug && clog.debug(`Unlinking ${filename}`);
		await unlinkFile(filename);
		return true;
	}

	static async getInternalDefaults(): Promise<CmsInternalDefaults> {
		return await Cms.readAndParseYamlFile(
			path.join(Config.SRC_DATA_DIR, '_defaults-template.yaml')
		);
	}

	// Prvy krok - nacita data surove... (schemy, konfigy, existujuce modely)
	static async readCmsRawData(
		dirs: string | string[],
		masterDefaults?
	): Promise<CmsInternalRawData> {
		if (!Array.isArray(dirs)) dirs = [dirs];
		dirs = [...new Set(dirs.map(path.normalize))];

		let _defaults = {
			_access: {},
			_schema: {},
			_schema_property_template: {},
			_meta: {},
			...(masterDefaults || (await Cms.getInternalDefaults())),
		};

		let _models = {};
		let _configs = {};

		return new Promise(async (resolve, reject) => {
			try {
				for (let dir of dirs) {
					await totalist(dir, async (name, abs, stats) => {
						const relpath = abs.substr(dir.length + 1).replace(/\\/g, '/');
						const depth = (relpath.match(/\//g) || []).length;

						if (/\.yaml$/i.test(name)) {
							// special case config (if exists)
							if (relpath === '__defaults.yaml') {
								_defaults = _.merge(_defaults, await Cms.readAndParseYamlFile(abs));
							}
							// consider every top level yaml as schema
							else if (depth === 0) {
								const entity = path.basename(name, '.yaml');
								_configs[entity] = {
									_access: {},
									_schema: {},
									...(await Cms.readAndParseYamlFile(abs)),
								};
							}
						}

						// consider every 1st level json as model data
						else if (/\.json$/i.test(name) && depth === 1) {
							const entity = path.basename(path.dirname(relpath));
							// file basename is the top-level id authority
							const id = path.basename(name, '.json');
							if (entity !== entity.toLowerCase()) {
								clog.error(
									`Invalid entity name ${bold(entity)} (name must be lowercased)`
								);
								process.exit(1);
							}

							_models[entity] = _models[entity] || {};
							_models[entity] = _models[entity] || {};
							_models[entity][id] = await Cms.readAndParseJsonFile(abs);
						} else {
							// maybe log unexpected file warning?
						}
					});
				}
			} catch (e) {
				return reject(e);
			}

			resolve({ _defaults, _models, _configs });
		});
	}

	// Processes raw data and creates CmsStore (which will be stored in memory)...
	static async createStore(
		rawData: CmsInternalRawData,
		debug = false
	): Promise<CmsStore> {
		const { _configs, _defaults, _models } = rawData;

		const models: CmsEntityMap = Object.create(null);
		const access: CmsAccessMap = Object.create(null);
		const schemas: CmsSchemaMap = Object.create(null);
		const meta: CmsMetaMap = Object.create(null);

		Object.entries(_configs).forEach(([entity, _config]) => {
			// prettier-ignore
			debug && _.isEmpty(_config._schema) && clog.warn(
				`Found empty ${bold(entity + '._schema')} config... Using plain default.`
			);

			const schema = _.merge({}, _defaults._schema, _config._schema);
			// allways assign proper $id
			schema.$id = `#/${entity}`;
			// allways add "id" as required
			schema.required = [...new Set(['id'].concat(schema.required || []))];

			// todo: maybe remove?
			// apply property template to each
			Object.entries(schema.properties).forEach(([k, _config]) => {
				_config = _.merge({}, _defaults._schema_property_template, _config);
				schema.properties[k] = _config;
			});

			schemas[entity] = Schema.validateSchema(schema);
			access[entity] = _.merge({}, _defaults._access, _config._access);
			meta[entity] = _.merge({}, _defaults._meta, _config._meta);
			models[entity] = Object.create(null);

			// TODO: toto treba premysliet... pri zmene schemy kompletne odignoruje
			// chcelo by to vynutit nejaku migraciu na novu schemu...

			// whitelist valid models only
			Object.entries(_models[entity] || {}).forEach(([id, data]) => {
				// force id from filename
				data.id = id;
				try {
					data = Schema.validate(schema, data);
					// note: tu musime robit "pre read" nie "pre create"...
					models[entity][id] = Crud.applyPreReadAll(schema, data);
				} catch (e) {
					debug &&
						clog.warn(`Ignoring ${bold(`${entity}(${data.id}):`)} ${e.toString()}`);
				}
			});

			delete _models[entity];
		});

		// orphan warning (no big deal)...
		debug &&
			Object.entries(_models).forEach(([entity, _models]) => {
				const len = Object.keys(_models).length;
				clog.debug(`Found ${bold(`${len} ${entity}`)} orphan model...`);
			});

		return { models, schemas, access, meta };
	}

	static async createProjectStore(config: ProjectConfig) {
		return await Cms.createStore(await Cms.readCmsRawData(config.dataDir));
	}
}
