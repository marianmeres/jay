import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import fs from 'fs';
import { del, patch } from 'httpie';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config } from '../config.js';
import { STATUS } from '../lib/constants.js';
import { Asset } from '../services/asset.js';
import { Project } from '../services/project.js';
import { API_ENT_ASSET, TestUtil } from './_test-util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcCatJpg = path.join(Config.SRC_DATA_DIR, 'cat.jpg');
const srcFooTxt = path.join(Config.SRC_DATA_DIR, 'foo.txt');
const srcSvg = path.join(Config.SRC_DATA_DIR, 'circle.svg');

const suite = new TestRunner(path.basename(__filename));

suite.test('upload file works', async () => {
	const project = await Project.factory('test');
	const { id, title } = await TestUtil.uploadFile(srcCatJpg, {
		title: 'Tom the cat',
		foo: 'bar',
	});

	const modelFile = path.join(
		project.config.dataDir,
		`${Config.ENTITY_ASSET}/${id}.json`
	);
	const json = JSON.parse(fs.readFileSync(modelFile, 'utf8'));

	assert(title === 'Tom the cat');
	assert(title === json.title);
	assert(json._format.thumbnail._width === Asset.THUMBNAIL_SIZE);
	// console.log(JSON.stringify(json, null, 2));

	// custom cleanup
	fs.unlinkSync(modelFile);
	await TestUtil.refreshCache();
});

suite.test('upload non image file works', async () => {
	const project = await Project.factory('test');
	const { id, title } = await TestUtil.uploadFile(srcFooTxt, { title: 'Foo' });

	const modelFile = path.join(
		project.config.dataDir,
		`${Config.ENTITY_ASSET}/${id}.json`
	);
	const json = JSON.parse(fs.readFileSync(modelFile, 'utf8'));

	assert(title === 'Foo');
	assert(title === json.title);

	assert(json._format === null);
	assert(json._width === null);
	assert(json._height === null);

	// assert(json._format.thumbnail._width === Asset.THUMBNAIL_SIZE);
	// console.log(JSON.stringify(json, null, 2));

	// custom cleanup
	fs.unlinkSync(modelFile);
	await TestUtil.refreshCache();
});

suite.test('upload + edit works', async () => {
	const project = await Project.factory('test');
	const { id, title } = await TestUtil.uploadFile(srcCatJpg, { title: 'Tom the cat' });
	const modelFile = path.join(
		project.config.dataDir,
		`${Config.ENTITY_ASSET}/${id}.json`
	);

	let { data } = await TestUtil.assertStatus(
		STATUS.OK,
		patch(`${API_ENT_ASSET}/${id}`, {
			body: {
				id,
				title: 'Tom Jones',
				_name: 'will be ignored',
			},
		})
	);

	const json = JSON.parse(fs.readFileSync(modelFile, 'utf8'));
	assert(data.title === 'Tom Jones');
	assert(json.title === 'Tom Jones');
	assert(json._name === 'cat.jpg'); // not "will be ignored"

	fs.unlinkSync(modelFile);
	await TestUtil.refreshCache();
});

suite.test('upload + delete works', async () => {
	const project = await Project.factory('test');

	// tu si musim vyrobit random temporary file, lebo cat mam casto krat
	// referencovane aj inde
	const f = path.join(Config.CMS_TEMP_DIR, 'random.txt');
	fs.writeFileSync(f, Math.random().toString(10) + '\n');

	const data = await TestUtil.uploadFile(f, { title: 'Random' });
	const { id, _assetFilename } = data;
	const assetFile = path.join(project.config.uploadDir, _assetFilename);

	assert(fs.existsSync(assetFile));
	const r = await TestUtil.assertStatus(STATUS.NO_CONTENT, del(`${API_ENT_ASSET}/${id}`));
	assert(!fs.existsSync(assetFile), 'Asset file was not deleted');
});

suite.test('SVG upload + delete works', async () => {
	const project = await Project.factory('test');

	// tu si musim vyrobit random temporary file, lebo cat mam casto krat
	// referencovane aj inde
	const rnd = Math.random().toString(10).slice(2);
	const f = path.join(Config.CMS_TEMP_DIR, `${rnd}-circle.svg`);
	fs.writeFileSync(
		f,
		`
		<svg xmlns="http://www.w3.org/2000/svg"  height="2000" width="2000" some="${rnd}">
			<circle cx="1000" cy="1000" r="900" stroke="black" stroke-width="3" fill="red" />
		</svg>
	`.trim()
	);

	const data = await TestUtil.uploadFile(f, { title: 'Random' });
	const { id, _assetFilename } = data;
	const assetFile = path.join(project.config.uploadDir, _assetFilename);

	const filesToCheck = [
		assetFile,
		// make sure thumbnails are created as png
		assetFile.replace('.svg', '_thumbnail.png'),
		assetFile.replace('.svg', '_small.png'),
	];

	for (let file of filesToCheck) {
		assert(fs.existsSync(file), `File not exists (${file})`);
	}

	const r = await TestUtil.assertStatus(STATUS.NO_CONTENT, del(`${API_ENT_ASSET}/${id}`));
	for (let file of filesToCheck) {
		assert(!fs.existsSync(file), `File was not deleted (${file})`);
	}
});

suite.test('upload + delete wont delete asset file if referenced', async () => {
	const project = await Project.factory('test');
	const f = path.join(Config.CMS_TEMP_DIR, 'random.txt');
	fs.writeFileSync(f, Math.random().toString(10) + '\n');

	// create two asset with same source file
	const data = await TestUtil.uploadFile(f, { title: 'One' });
	const data2 = await TestUtil.uploadFile(f, { title: 'Two' });

	const { id, _assetFilename } = data;
	const assetFile = path.join(project.config.uploadDir, _assetFilename);

	// sanity chesk
	assert(fs.existsSync(assetFile));

	// delete first, underlying file must not be deleted
	await TestUtil.assertStatus(STATUS.NO_CONTENT, del(`${API_ENT_ASSET}/${id}`));
	assert(fs.existsSync(assetFile), 'Asset SHOULD NOT have been deleted');

	// delete second, now should be deleted
	await TestUtil.assertStatus(STATUS.NO_CONTENT, del(`${API_ENT_ASSET}/${data2.id}`));
	assert(!fs.existsSync(assetFile), 'Asset SHOULD have been deleted');
});

export default suite;
