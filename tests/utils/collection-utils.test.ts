import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CollectionUtils } from '../../src/utils/collection-utils.js';
import { modelUid } from '../../src/utils/uuid.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
	findWhere,
	isModelUidLike,
	isFqEntityIdLike,
	isEntityNameLike,
	pickIncludedDeep,
	omapToMap,
} = CollectionUtils;

const suite = new TestRunner(path.basename(__filename), {
	// beforeEach: () => ,
	// after: schemaService.resetState,
});

const idMaker = (prefix: string) => {
	let _counter = 0;
	return () =>
		(prefix + `${++_counter}`.padStart(16 - prefix.length, '0'))
			.match(/.{1,4}/g)
			.slice(0, 4)
			.join('-');
};
const fId = idMaker('foo');
const sId = idMaker('sel');
const rId = idMaker('ref');

const f1 = fId(); // foo0-0000-0000-0001
const f2 = fId(); // foo0-0000-0000-0002 ...
const f3 = fId();
const f4 = fId();

const s1 = sId();
const s2 = sId();

const r1 = rId();
const r2 = rId();
const r3 = rId();
const r4 = rId();

const dump1 = {
	foo: {
		[f1]: { id: f1, name: 'bar', some: [1, 2, 3] },
		[f2]: { id: f2, name: 'baz', some: [3, 4, 5] },
		[f3]: {
			id: f3,
			name: 'bat',
			some: [6, 7, 8],
			another: [`ref/${r4}`, `_$selection/${s1}`],
		},
		[f4]: {
			id: f4,
			name: 'hey',
			some: 123,
			another: [`ref/${r1}`, `ref/${r2}`, `ref/${r3}`, `foo/${f3}`],
		},
	},
	ref: {
		[r1]: { id: r1 },
		[r2]: { id: r2 },
		[r3]: { id: r3 },
		[r4]: { id: r4 },
	},
	_$selection: {
		[s1]: {
			id: s1,
			of: 'foo',
			where: [['name', '/^b/']],
			order_by: 'id desc',
			limit: 2,
			pagesize: null,
		},
	},
};

suite.test('findWhere sanity check (no where returns all)', () => {
	const found = findWhere(dump1, 'foo');
	assert(Array.isArray(found) && found.length === 4);
});

suite.test('where works - simple k/v pair', () => {
	const found = findWhere(dump1, 'foo', { name: 'baz' });
	assert(found.length === 1);
	assert(found[0].name === 'baz');
});

suite.test('where works - prop in array + order', () => {
	const found = findWhere(dump1, 'foo', { name: ['baz', 'bat'] }, 'id desc');
	assert(found.length === 2);
	assert(found[0].name === 'bat');
	assert(found[1].name === 'baz');
});

suite.test('where works - regex', () => {
	const found = findWhere(dump1, 'foo', { name: '/^B/' }, 'name desc');
	assert(found.length === 3);
	assert(found[0].name === 'baz');
	assert(found[2].name === 'bar');
});

suite.test('where works - value in array (array intersection)', () => {
	let found = findWhere(dump1, 'foo', { some: 2 }, 'id asc');
	assert(found.length === 1);
	assert(found[0].name === 'bar');

	found = findWhere(dump1, 'foo', { some: [2] }, 'id asc');
	assert(found.length === 1);
	assert(found[0].name === 'bar');

	found = findWhere(dump1, 'foo', { some: [3, 3, 5, 6] }, 'id asc');
	assert(found.length === 3);
	assert(found[0].name === 'bar');
	assert(found[1].name === 'baz');
	assert(found[2].name === 'bat');
});

suite.test('where works - strict and non strict compare', () => {
	let found = findWhere(dump1, 'foo', { some: '123' });
	assert(found.length === 1);
	assert(found[0].name === 'hey');

	found = findWhere(dump1, 'foo', { some: 123 });
	assert(found.length === 1);
	assert(found[0].name === 'hey');
});

suite.test('is model uid like', () => {
	assert(isModelUidLike(modelUid()));
	assert(!isModelUidLike('kokos'));
});

suite.test('is entity name like', () => {
	// good
	assert(isEntityNameLike('kokos'));
	assert(isEntityNameLike('_$underscore-and-dollar-is_ok'));
	// bad
	assert(!isEntityNameLike('contains-sla/sh'));
	assert(!isEntityNameLike(' contains white space '));
	assert(!isEntityNameLike(' '));
});

suite.test('is fully qualified entity id', () => {
	// good
	assert(isFqEntityIdLike(['kokos', modelUid()].join('/')));
	// bad
	assert(!isFqEntityIdLike(['kokos', modelUid()].join('-')));
	assert(!isFqEntityIdLike(['kok/os', modelUid()].join('/')));
});

suite.test('pick included', () => {
	const included = pickIncludedDeep({ linked: `foo/${f1}` }, dump1);
	assert(Object.entries(included).length === 1);
	assert(included[`foo/${f1}`].id === f1);
});

suite.test('pick included selection', () => {
	let selectionResults = {};
	const fqs1 = `_$selection/${s1}`;
	const included = pickIncludedDeep({ fqs1 }, dump1, selectionResults);
	// console.log(included);
	// console.log(selectionResults);

	assert(Object.entries(included).length === 4);
	assert(Object.entries(selectionResults).length === 1);
	assert(selectionResults[fqs1].length === 2);
	assert(included[selectionResults[fqs1][0]].id === f3); // lebo order_by id desc
});

suite.test('pick included recurseLimit', () => {
	let included = pickIncludedDeep({ some: `foo/${f4}` }, dump1);
	// console.log(included);
	// f + 3r + f + r + s + f = 8
	assert(Object.keys(included).length === 8);

	//
	included = pickIncludedDeep({ some: `foo/${f4}` }, dump1, {}, {}, 1);
	// console.log(included);
	// f + 3r + f = 5
	assert(Object.keys(included).length === 5);
});

suite.test('pick included recurseLimitByEntity', () => {
	// prettier-ignore
	let included = pickIncludedDeep(
		{ some: `foo/${f4}` }, dump1, {}, { ref: 1 }
	);
	// console.log(included);

	assert(Object.keys(included).length === 7);
	// nesme obsahovat ref4, lebo to je z druheho recursu
	assert(!included[`ref/${r4}`]);
	// ale ine z druheho moze
	assert(included[`_$selection/${s1}`]);
});

export default suite;
