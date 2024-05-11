import { createClog } from '@marianmeres/clog';
import { TestRunner } from '@marianmeres/test-runner';
import { strict as assert } from 'assert';
import fs from 'fs';
import _ from 'lodash';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import rimraf from 'rimraf';
import { Config } from '../../src/config.js';
import { Asset } from '../../src/services/asset.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clog = createClog(path.basename(fileURLToPath(import.meta.url)));

const srcCatJpg = path.join(Config.SRC_DATA_DIR, 'cat.jpg');
const srcCat2Jpg = path.join(Config.SRC_DATA_DIR, 'cat-vertical.jpg');
const srcCat3Jpg = path.join(Config.SRC_DATA_DIR, 'cat-square.jpg');
const srcCat4Jpg = path.join(Config.SRC_DATA_DIR, 'cat-square-small.jpg');
const srcFooTxt = path.join(Config.SRC_DATA_DIR, 'foo.txt');
const srcSvg = path.join(Config.SRC_DATA_DIR, 'circle.svg');
const tmpTestDir = path.join(Config.CMS_TEMP_DIR, 'asset-test');

const catMd5 = 'a321660d5f0a585335ed3e7965cb7e9b';
// const assetCatJpg = path.join(Config.PROJECT_DATA_DIR, 'cat.jpg');
// const assetFooTxt = path.join(Config.PROJECT_DATA_DIR, 'foo.txt');

const IMG_FORMAT_KEYS = ['_width', '_height', '_size', '_assetFilename'];

const suite = new TestRunner(path.basename(__filename), {
	beforeEach: () => {
		rimraf.sync(tmpTestDir);
		fs.mkdirSync(tmpTestDir, { recursive: true });
	},
	after: () => {
		rimraf.sync(tmpTestDir);
	},
});

suite.test('get ext spec', () => {
	assert(Asset.getExtension('foo') === null);
	assert(Asset.getExtension('foo.jpg') === '.jpg');
	assert(Asset.getExtension('some/foo.PNg') === '.png');
	assert(Asset.getExtension('.htaccess') === '.htaccess');
	assert(Asset.getExtension('') === null);
	assert(Asset.getExtension('  ') === null);
	assert(Asset.getExtension(null) === null);
	assert(Asset.getExtension(0.2) === '.2');
});

suite.test('get mime type works', () => {
	//
	assert(Asset.getMimeType('foo.jpg') === 'image/jpeg');
	assert(Asset.getMimeType('/some/path/foo.jpeg') === 'image/jpeg');
	assert(Asset.getMimeType('gif') === 'image/gif');
	assert(Asset.getMimeType('.MP3') === 'audio/mpeg');
	//
	assert(Asset.getMimeType('asdfasdf') === 'application/octet-stream');
	assert(Asset.getMimeType(null) === 'application/octet-stream');
});

suite.test('hash file', async () => {
	assert((await Asset.hashFile(srcCatJpg)) === catMd5);
	assert((await Asset.hashFile(srcFooTxt)) !== catMd5);
});

suite.test('read asset meta', async () => {
	let stats = await Asset.readAssetMeta(srcCatJpg);

	assert(stats._mtime);
	assert(
		_.isEqual(_.omit(stats, ['_mtime']), {
			_name: 'cat.jpg',
			_extension: '.jpg',
			_mime: 'image/jpeg',
			_size: 1443503,
			_width: 4106,
			_height: 2720,
			_hash: catMd5,
			_assetFilename: catMd5 + '.jpg',
		})
	);

	stats = await Asset.readAssetMeta(srcFooTxt);
	assert(
		_.isEqual(_.omit(stats, ['_mtime', '_hash', '_assetFilename']), {
			_name: 'foo.txt',
			_extension: '.txt',
			_mime: 'text/plain',
			_size: 4,
			_width: null,
			_height: null,
		})
	);
});

suite.test('resize horizontal works', async () => {
	const outFile = path.join(tmpTestDir, 'cat-resized.jpg');
	assert(!fs.existsSync(outFile));
	await Asset.resizeImage(srcCatJpg, outFile);
	assert(fs.existsSync(outFile));
	const meta = await Asset.readAssetMeta(outFile);
	assert(meta._width === Asset.SMALL_SIZE);
	assert(meta._height < Asset.SMALL_SIZE);
});

suite.test('resize vertical works', async () => {
	const outFile = path.join(tmpTestDir, 'cat-resized-vertical.jpg');
	assert(!fs.existsSync(outFile));
	await Asset.resizeImage(srcCat2Jpg, outFile);
	assert(fs.existsSync(outFile));
	const meta = await Asset.readAssetMeta(outFile);
	assert(meta._width < Asset.SMALL_SIZE);
	assert(meta._height === Asset.SMALL_SIZE);
});

suite.test('resize squared works', async () => {
	const outFile = path.join(tmpTestDir, 'cat-resized-square.jpg');
	assert(!fs.existsSync(outFile));
	await Asset.resizeImage(srcCat3Jpg, outFile);
	assert(fs.existsSync(outFile));
	const meta = await Asset.readAssetMeta(outFile);
	assert(meta._width === Asset.SMALL_SIZE);
	assert(meta._height === Asset.SMALL_SIZE);
});

suite.test('resize will not enlarge', async () => {
	const outFile = path.join(tmpTestDir, 'cat-resized-small.jpg');
	assert(!fs.existsSync(outFile));
	await Asset.resizeImage(srcCat4Jpg, outFile);
	assert(fs.existsSync(outFile));
	const meta = await Asset.readAssetMeta(outFile);
	// assert it did not enlarge
	assert(meta._width < Asset.SMALL_SIZE);
	assert(meta._height < Asset.SMALL_SIZE);
});

suite.test('resize on non image throws', async () => {
	const outFile = path.join(tmpTestDir, 'nonsense');
	await assert.rejects(() => Asset.resizeImage(srcFooTxt, outFile));
});

suite.test('create asset file works', async () => {
	const r = await Asset.createAssetFile(
		srcCatJpg,
		{
			title: 'Tom',
			description: 'the Jerry chaser',
			alt: 'cat image',
			folder: '/cats',
		},
		tmpTestDir,
		false
	);

	assert(fs.existsSync(path.join(tmpTestDir, r._assetFilename)));
	assert(fs.existsSync(path.join(tmpTestDir, r._format.thumbnail._assetFilename)));
	assert(fs.existsSync(path.join(tmpTestDir, r._format.small._assetFilename)));
});

suite.test('create small asset file works', async () => {
	const r = await Asset.createAssetFile(
		srcCat4Jpg,
		{
			title: 'Tom',
			description: 'the Jerry chaser',
			alt: 'cat image',
			folder: '/cats',
		},
		tmpTestDir,
		false
	);

	assert(fs.existsSync(path.join(tmpTestDir, r._assetFilename)));
	assert(fs.existsSync(path.join(tmpTestDir, r._format.thumbnail._assetFilename)));

	// clog(r);
	// both 'small' and 'large' must exists, but must be identical to original
	assert(_.isEqual(r._format.small, _.pick(r, IMG_FORMAT_KEYS)));
	assert(_.isEqual(r._format.large, _.pick(r, IMG_FORMAT_KEYS)));
});

// suite.only('resize svg works', async () => {
// 	const outFile = path.join(tmpTestDir, 'circle.png');
// 	assert(!fs.existsSync(outFile));
// 	const x = await Asset.resizeImage(srcSvg, outFile);
// 	console.log(x);
// })

suite.test('create asset nonimage works', async () => {
	const r = await Asset.createAssetFile(
		srcFooTxt,
		{
			title: 'Foo',
			description: 'bar',
			alt: '?',
			folder: '/kokos',
		},
		tmpTestDir,
		false
	);
	assert(fs.existsSync(path.join(tmpTestDir, r._assetFilename)));
	assert(r._format === null);
	assert(r._width === null);
	assert(r._height === null);
});

suite.test('unklink asset file', async () => {
	const r = await Asset.createAssetFile(srcCatJpg, null, tmpTestDir, false);
	const delcount = await Asset.unlinkAssetFile(r._hash, tmpTestDir);
	assert(delcount === 4);
	assert(!fs.existsSync(path.join(tmpTestDir, r._assetFilename)));
});

export default suite;
