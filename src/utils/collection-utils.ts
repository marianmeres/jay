import shuffle from 'lodash/shuffle.js';
import _orderBy from 'lodash/orderBy.js';

// NOTE: toto je myslene ako standalone copy+paste utilitka

type CmsCollection = Record<string, any>;
type CmsDump = Record<string, CmsCollection>;
type CmsSelectionWhere = [string, any][] | Map<string, any> | Record<string, any>;

// "xxxx-xxxx-xxxx-xxxx"
const MODEL_UID_REGEX = /^[^-\/]{4}(?:-[^\/-]{4}){3}$/;
const _isModelUidLike = (v) => MODEL_UID_REGEX.test(`${v || ''}`);

// anything except slash and whitespace
const ENTITY_NAME_REGEX = /^[^\/\s]+$/;
const _isEntityNameLike = (v) => ENTITY_NAME_REGEX.test(`${v || ''}`);

// fully qualified entity id: "name/xxxx-xxxx-xxxx-xxxx"
const _isFqEntityIdLike = (v) => {
	const parts = `${v || ''}`.split('/');
	return parts.length === 2 && _isEntityNameLike(parts[0]) && _isModelUidLike(parts[1]);
};

//
const _omapToMap = (omap: [string, any][]): Map<string, any> => {
	// transform few special cases as value data from omap are *always* strings (gui form input)...
	const transform = { true: true, false: false, null: null, '': false };
	omap = (omap || []).map(([k, v]) => {
		if (typeof v === 'string') {
			const _v = v.toLowerCase();
			v = transform[_v] !== void 0 ? transform[_v] : v;
		}
		return [k, v];
	});
	return new Map<string, any>(omap);
};

//
const _normalizeWhere = (where: CmsSelectionWhere): Map<string, any> => {
	if (Array.isArray(where)) {
		where = _omapToMap(where);
	} else if (where && !(where instanceof Map)) {
		where = new Map(Object.entries(where));
	}
	return (where || new Map()) as Map<string, any>;
};

//
const _applyWhere = (
	entityType: string,
	collection: CmsCollection,
	where: CmsSelectionWhere
) => {
	where = _normalizeWhere(where);
	const whereCount = where.size;
	const found = whereCount ? [] : collection;
	const isArray = Array.isArray;

	if (whereCount) {
		Object.entries(collection).forEach(([id, entity]) => {
			let counter = 0;
			where.forEach((whereVal, whereKey) => {
				if (entity[whereKey] === void 0) {
					// throw new Error(`Property '${whereKey}' not found id '${entityType}'`);
					return;
				}

				// todo implement conditionals $k lookup

				// special case ak property je array
				if (isArray(entity[whereKey])) {
					// a.k.a. array_intersect
					const whereValArr = isArray(whereVal) ? whereVal : [whereVal];
					const intersection = entity[whereKey].filter((value) =>
						whereValArr.includes(value)
					);

					if (intersection.length) counter++;
				}
				// "value IN [...]"
				else if (isArray(whereVal) && whereVal.includes(entity[whereKey])) {
					counter++;
				}
				// naive regex detection... doplname case insensitive "i"
				else if (
					typeof whereVal === 'string' &&
					whereVal.startsWith('/') &&
					whereVal.endsWith('/') &&
					new RegExp(whereVal.slice(1, -1), 'i').test(entity[whereKey])
				) {
					counter++;
				}
				// intentional non strict comparison (lebo data z cms omapu...)
				else if (entity[whereKey] == whereVal) {
					counter++;
				}
			});

			if (counter === whereCount) {
				found.push(entity);
			}
		});
	}

	return found;
};

//
const _findWhere = (
	collections: CmsDump,
	entityType: string,
	where: CmsSelectionWhere = null,
	orderBy: string = null,
	limit: number = null,
	offset: number = 0,
	assert: boolean = false
) => {
	const collection: CmsCollection = collections[entityType] || {};
	let found = _applyWhere(entityType, collection, where);

	// ak bol where efektivny, tak by sme mali mat pole, inak state mozno mapa...
	// ale tu chceme urcite pole
	if (!Array.isArray(found)) {
		found = Object.values(found);
	}

	if (assert && !found.length) {
		throw new Error(
			`Expecting to find existing '${entityType}' for ${JSON.stringify(where)}`
		);
	}

	// random special case
	if (orderBy && orderBy.toLowerCase() === 'random') {
		found = shuffle(found);
	}
	// "regular" order by
	else if (orderBy) {
		// tu mimikujeme sql hantirku: ORDER BY column1 [ASC|DESC], column2 [ASC|DESC] ...;
		const pairs = orderBy
			.split(',')
			.map((v) => v.trim())
			.filter(Boolean)
			.map((v) => {
				const p = v
					.split(' ')
					.map((v) => v.trim())
					.filter(Boolean);
				return [p[0], p[1] || 'asc'];
			});

		const columns = pairs.map((p) => p[0]);
		const orders = pairs.map((p) => p[1]);
		// console.log(orderBy, pairs, columns, orders);

		// Sort by `user` in ascending order and by `age` in descending order.
		// _.orderBy(users, ['user', 'age'], ['asc', 'desc']);
		found = _orderBy(found, columns, orders as any);
	}

	if (limit || offset) {
		offset = offset || 0;
		limit = limit ? offset + limit : null;
		found = found.slice(offset, limit);
	}

	// tu uz nemusi byt zjavne ake su data... tak si pridame hint na oririgin type
	return found.map((v) => ({ ...v, __entity_type__: entityType }));
};

//
const _countWhere = (
	collections: CmsDump,
	entityType: string,
	where: CmsSelectionWhere = null
) => {
	const collection: CmsCollection = collections[entityType] || {};
	const found = _applyWhere(entityType, collection, where);
	return found.length;
};

const _pickIncludedDeep = (
	from: object,
	collections: Record<string, Record<string, any>>,
	selectionResults = null,
	recurseLimitByEntity = {}, // { page: 2 }
	recurseLimit = 0,
	selectionWhereReplaceMap = null
) => {
	// ak nemame vobec definovanu, alebo depth nesmie byt vacsia
	const _isRecurseLimitByEntityOk = (_entity, _depth) =>
		!(_entity in recurseLimitByEntity) || !(_depth > recurseLimitByEntity[_entity]);

	const _pick = (obj: any = {}, store = {}, depth) => {
		// general topmost recurse limit
		if (recurseLimit && depth > recurseLimit) {
			return store;
		}

		return Object.entries(obj).reduce((memo, [property, value]) => {
			if (!Array.isArray(value)) value = [value];
			(value as any).forEach((v) => {
				if (_isFqEntityIdLike(v) && !memo[v]) {
					const [entity, id] = v.split('/');
					// console.log(depth, v);

					let found = (collections[entity] || {})[id];
					if (found) {
						// vzdy si ukladame do dat aj nazov entity... je pohodlne mat to poruke
						found.__entity_type__ = entity;

						// memo[v] = found;
						if (_isRecurseLimitByEntityOk(entity, depth)) {
							found.__depth__ = depth;
							memo[v] = found;
						}
						memo = _pick(found, memo, depth + 1); // recurse

						// _$selection conventional special case
						if (entity === '_$selection') {
							const { of, where, order_by, limit } = collections[entity][id];

							// magic feature: do selectionResults si priamo referencujem
							// najdene zaznamy, aby tuto logiku nebolo treba riesit neskor znova.
							// POZOR: robime to iba raz, pri prvom vyskyte _$selection-y
							// POZOR2: bez offsetu (paging je tu mimo), vid nizsie...
							let _doSelectionResults = false;
							if (selectionResults && !selectionResults[v]) {
								selectionResults[v] = [];
								_doSelectionResults = true;
							}

							// ak posielame parametre zvonka, tak tu aplikujeme na where palceholdre
							let __where__ = where;
							if (_doSelectionResults && selectionWhereReplaceMap && where) {
								__where__ = JSON.parse(JSON.stringify(__where__)); // poor man's clone
								for (let [i, w] of __where__.entries()) {
									w[1] = selectionWhereReplaceMap[w[1]] || w[1];
									__where__[i] = w;
								}
								// len pre info, ukladame si aj resolvnuty where, kvoli debugu...
								collections[entity][id].__where__ = __where__;
							}

							_findWhere(collections, of, __where__, order_by, limit).forEach(
								(_found) => {
									const foundFqId = [of, _found.id].join('/');

									if (_doSelectionResults) {
										selectionResults[v].push(foundFqId);
									}

									if (!memo[foundFqId]) {
										// memo[foundFqId] = _found;
										if (_isRecurseLimitByEntityOk(entity, depth)) {
											_found.__depth__ = depth;
											memo[foundFqId] = _found;
										}
										memo = _pick(_found, memo, depth + 1); // recurse
									}
								}
							);
						}
					}
				}
			});

			return memo;
		}, store);
	};

	return _pick(from, {}, 0);
};

//
export class CollectionUtils {
	static isModelUidLike = _isModelUidLike;
	static isEntityNameLike = _isEntityNameLike;
	static isFqEntityIdLike = _isFqEntityIdLike;
	static findWhere = _findWhere;
	static omapToMap = _omapToMap;
	static pickIncludedDeep = _pickIncludedDeep;
}
