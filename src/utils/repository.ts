import { createClog } from '@marianmeres/clog';
import _ from 'lodash';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NotFound } from './errors.js';
import { modelUid } from './uuid.js';

const clog = createClog(path.basename(fileURLToPath(import.meta.url)));

const _assertWhere = (where) => {
	if (!where) throw new TypeError('Missing where parameter');
	return where;
};

const _assertModel = (model: ModelLike) => {
	if (!model) throw new TypeError('Invalid (falsey) model instance');
	return model;
};

const _assertId = (model: ModelLike) => {
	_assertModel(model);
	// Intentionally no id-generation business here...
	if (!model.id) {
		throw new TypeError('Model must have an id property');
	}
	if (typeof model.id !== 'string') {
		throw new TypeError('Model must have a string id value');
	}
	return model;
};

const _sanitizeWhere = (where) => {
	if (where && where.id) {
		// since we're forcing string id on input, make sure we're also query by string
		where.id = `${where.id}`;
	}
	// consider primitives as id
	else if ((where && typeof where === 'string') || typeof where === 'number') {
		where = { id: `${where}` };
	}
	return where;
};

const _defatultComparator = (a: ModelLike, b: ModelLike): number => {
	if (!a._created_at || !b._created_at) {
		return 0;
	}
	return new Date(a._created_at).valueOf() - new Date(b._created_at).valueOf();
};

const _isFn = (v) => typeof v === 'function';

export interface ModelLike {
	id?: string;
	[key: string]: any;
	_created_at?: string | number | Date;
	_updated_at?: string | number | Date;
	_owner?: string;
}

interface RepositoryOptions<T> {
	entity: string;
	storage: { [id: string]: T };
	comparator: (a: T, b: T) => number;
	writer: (model: T, ...a) => Promise<any>;
	preCreate: (model: T, ...a) => Promise<T>;
	preRead: (model: T, ...a) => Promise<T>;
	preUpdate: (model: T, ...a) => Promise<T>;
	preDelete: (model: T, ...a) => Promise<any>;
}

/**
 * A in-memory repository with support for external writing
 */
export class Repository<T extends ModelLike> {
	entity: string;

	// in-memory store
	protected _storage: { [id: string]: Partial<T> };

	// used in array.sort
	comparator: (a: T, b: T) => number;

	//
	writer: (model: Partial<T>, ...a) => Promise<T>;

	// modification hooks - could be implemente through storage proxy, but let's
	// keep it more transparent here...
	preCreate: (model: Partial<T>, ...a) => Promise<T>;
	preRead: (model: Partial<T>, ...a) => Promise<T>;
	preUpdate: (model: Partial<T>, ...a) => Promise<T>;
	preDelete: (model: Partial<T>, ...a) => Promise<any>;

	constructor({
		entity,
		storage,
		comparator,
		writer,
		preCreate,
		preUpdate,
		preRead,
		preDelete,
	}: Partial<RepositoryOptions<T>> = {}) {
		// entity name
		this.entity = entity;

		// id based map
		this._storage = Object.create(null);

		if (Array.isArray(storage)) {
			storage.forEach((m) => m.id && (this._storage[m.id] = m));
		} else if (storage) {
			this._storage = storage;
		}

		if (!entity) {
			throw new Error('Missing required "entity" name option.');
		}

		this.comparator = _isFn(comparator) ? comparator : _defatultComparator;
		this.writer = writer;

		this.preCreate = preCreate;
		this.preRead = preRead;
		this.preUpdate = preUpdate;
		this.preDelete = preDelete;
	}

	_values(sorted = false): Partial<T>[] {
		let values = Object.values(this._storage);
		if (sorted) {
			values.sort(this.comparator);
		}
		return values;
	}

	async exists(id: string): Promise<boolean> {
		return !!(await this.count({ id }));
	}

	async count(where = null): Promise<number> {
		where = _sanitizeWhere(where);
		// special case where with id only
		if (where && where.id && Object.keys(where).length === 1) {
			return this._storage[where.id] ? 1 : 0;
		}
		if (!where) {
			return Object.keys(this._storage).length;
		}
		return (_.filter(this._values(), where) || []).length;
	}

	protected async _exec(which, model: Partial<T>, addon?) {
		switch (which) {
			case 'preCreate':
				return _isFn(this.preCreate) ? await this.preCreate(model, addon) : model;
			case 'preRead':
				return _isFn(this.preRead) ? await this.preRead(model, addon) : model;
			case 'preUpdate':
				return _isFn(this.preUpdate) ? await this.preUpdate(model, addon) : model;
			case 'preDelete':
				return _isFn(this.preDelete) ? await this.preDelete(model, addon) : model;
			case 'writer':
				return _isFn(this.writer) ? await this.writer(model, addon) : model;
		}
	}

	async insert(model: Partial<T>): Promise<Partial<T>> {
		await this._assertNotExists(model);
		model = await this._exec('preCreate', model);
		model = await this._exec('writer', model);
		return (this._storage[model.id] = model);
	}

	async update(model: Partial<T>): Promise<Partial<T>> {
		await this._assertExists(model); // asserts id
		model = { ...this._storage[model.id], ...model };
		model = await this._exec('preUpdate', model);
		model = await this._exec('writer', model);
		return (this._storage[model.id] = model);
	}

	async save(model: Partial<T>): Promise<Partial<T>> {
		_assertModel(model);
		return (await this.exists(model.id)) ? this.update(model) : this.insert(model);
	}

	async delete(modelOrId: Partial<T> | string): Promise<any> {
		const id = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;
		// for potential side-effects
		let model = await this.findOne(id, true);
		await this._exec('preDelete', model);
		await this._exec('writer', model, { action: 'delete' });
		delete this._storage[model.id];
		return model; // return deleted model
	}

	async findOne(whereOrId, assert = false): Promise<Partial<T>> {
		const where = _sanitizeWhere(_assertWhere(whereOrId));
		let found;
		// special case where with id only
		if (where.id && Object.keys(where).length === 1) {
			found = this._storage[where.id];
		} else {
			found = _.find(this._values(), where);
		}
		if (assert && !found) throw new NotFound();
		return await this._exec('preRead', found);
	}

	async findAll(where = null /* todo: limit = 0, offset = 0*/): Promise<Partial<T>[]> {
		const withPreRead = async (values) => {
			let out = [];
			for (let v of values) {
				out.push(await this._exec('preRead', v));
			}
			return out;
		};

		// otazka je, ci by preRead nemal by aplikovany uz na urovni _values...

		if (!where) {
			return await withPreRead(this._values(true));
		}
		return await withPreRead(_.filter(this._values(true), where));
	}

	async _assertExists(model: Partial<T>) {
		_assertId(model);
		if (!(await this.count({ id: model.id }))) {
			throw new NotFound();
		}
	}

	async _assertNotExists(model: Partial<T>) {
		_assertModel(model);
		if (!model.id) return;
		_assertId(model);
		if (await this.count({ id: model.id })) {
			throw new Error('Model already exists');
		}
	}

	static withId(model: ModelLike, force = true): ModelLike {
		_assertModel(model);
		if (!model.id || force) model.id = modelUid();
		return model;
	}

	static with(model: ModelLike, data = {}, force = false): ModelLike {
		if (force) {
			return _.merge({}, data || {}, model);
		} else {
			return _.merge(model, data || {});
		}
	}
}
