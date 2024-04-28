import { createClog } from '@marianmeres/clog';
import crypto from 'crypto';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { totalist } from 'totalist';
import util from 'util';
import { mimeTypes } from '../utils/mime-types.js';
import { ModelLike } from '../utils/repository.js';

const fsStat = util.promisify(fs.stat);
const fsExists = util.promisify(fs.exists);
const fsRename = util.promisify(fs.rename);
const fsCopy = util.promisify(fs.copyFile);
const fsUnlink = util.promisify(fs.unlink);

const clog = createClog(path.basename(fileURLToPath(import.meta.url)));

interface AssetMeta {
	_name: string;
	_extension: string;
	_mime: string;
	_size: number;
	_mtime: Date;
	_width: number;
	_height: number;
	_hash: string;
	_assetFilename: string;
}

interface ImageFormatMeta {
	_width: number;
	_height: number;
	_size: number;
	_assetFilename: string;
}

interface AssetInputData {
	title: string;
	description: string;
	alt: string;
	folder: string;
}

export interface AssetModel extends AssetInputData, AssetMeta, ModelLike {
	_format: Partial<{
		thumbnail: ImageFormatMeta;
		small: ImageFormatMeta;
	}>;
}

export class Asset {
	static readonly LARGE_SIZE = 1280;
	static readonly SMALL_SIZE = 640;
	static readonly THUMBNAIL_SIZE = 80;

	/**
	 * @param filename
	 */
	static getExtension(filename) {
		if (!filename) return null;
		const ext = `${filename}`.match(/\.([^.]+)$/);
		return ext ? ext[0].toLowerCase() : null;
	}

	/**
	 * @param filename
	 */
	static getMimeType(filename: string): string {
		const fallback = 'application/octet-stream';
		let ext = Asset.getExtension(filename);

		// special case - if ext was not detected and filename exists, consider it
		// as actual extension without the dot, so we need to add the dot to
		// be able to use e.g.: Asset.getMimeType('gif')
		if (!ext && filename) ext = `.${filename}`;

		return ext ? mimeTypes[ext] || fallback : fallback;
	}

	/**
	 * @param filename
	 */
	static isImage(filename) {
		return /image\//.test(Asset.getMimeType(filename));
	}

	/**
	 * @param filename
	 */
	static async readAssetMeta(filename): Promise<AssetMeta> {
		const stats = await fsStat(filename);
		const _mime = Asset.getMimeType(filename);
		const _hash = await Asset.hashFile(filename);
		const _extension = Asset.getExtension(filename);
		const _assetFilename = _hash + _extension;

		let meta = {
			_name: path.basename(filename),
			_extension,
			_mime,
			_size: stats.size,
			_mtime: stats.mtime,
			_width: null,
			_height: null,
			_hash,
			_assetFilename,
		};

		if (Asset.isImage(filename)) {
			const image = sharp(filename);
			const imeta = await image.metadata();
			meta = { ...meta, _width: imeta.width, _height: imeta.height };
		}

		return meta;
	}

	/**
	 * @param filename
	 * @param assetData
	 * @param assetFileDir
	 * @param deleteSourceAssetFile
	 */
	static async createAssetFile(
		filename,
		assetData: Partial<AssetInputData>,
		assetFileDir,
		deleteSourceAssetFile = false
	): Promise<Partial<AssetModel>> {
		const stats = await Asset.readAssetMeta(filename);
		const targetAssetFile = path.join(assetFileDir, stats._assetFilename);

		let out: Partial<AssetModel> = {
			...(assetData || {}),
			...stats,
			_format: null,
		};

		// file bude mat v storage nazov podla svojho hashu, co znamena, ze rovnake
		// subory (s rozdielnymi userland datami) budu ulozene vzdy iba raz

		// ak je image, tak pripravime 2 dalsie velkosti
		if (Asset.isImage(filename)) {
			out._format = {};
			const conf = {
				large: Asset.LARGE_SIZE,
				small: Asset.SMALL_SIZE,
				thumbnail: Asset.THUMBNAIL_SIZE,
			};
			for (const [name, max] of Object.entries(conf)) {
				// do not resize smaller than max files
				if (max > stats._width && max > stats._height) {
					continue;
				}
				// force png thumbs for svg file
				const ext = /\.svg$/i.test(stats._extension) ? '.png' : stats._extension;

				const outfile = path.join(assetFileDir, stats._hash + '_' + name + ext);
				await Asset.resizeImage(filename, outfile, { max });
				const resizedMeta = await Asset.readAssetMeta(outfile);
				out._format[name] = <ImageFormatMeta>{
					_width: resizedMeta._width,
					_height: resizedMeta._height,
					_size: resizedMeta._size,
					_assetFilename: path.basename(outfile),
				};
			}
		}

		if (deleteSourceAssetFile) {
			await fsRename(filename, targetAssetFile);
		} else {
			await fsCopy(filename, targetAssetFile);
		}

		return out;
	}

	static async unlinkAssetFile(hash, assetFileDir) {
		let counter = 0;
		await totalist(assetFileDir, async (rel, abs, stats) => {
			if (rel.includes(hash)) {
				await fsUnlink(abs);
				counter++;
			}
		});
		return counter;
	}

	/**
	 * https://sharp.pixelplumbing.com/api-resize#resize
	 *
	 * @param infile
	 * @param outfile
	 * @param max
	 * @param width
	 * @param height
	 * @param withoutEnlargement
	 * @param fit
	 * @param background
	 */
	static async resizeImage(
		infile,
		outfile,
		{
			max = Asset.SMALL_SIZE,
			width = null,
			height = null,
			withoutEnlargement = true,
			fit = 'contain',
			background = { r: 0, g: 0, b: 0, alpha: 1 },
		}: Partial<{
			// bigger of the widht/height
			max: number;
			width: number;
			height: number;
			fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
			// do not enlarge if the width or height are already less than the specified dimensions
			withoutEnlargement: boolean;
			// background colour when using a fit of contain
			background: { r: number; g: number; b: number; alpha: number };
		}> = {}
	) {
		// the option 'withoutEnlargement' seems to stop working after sharp update (it shouldn't
		// based on docs...). Not digging deep, just simply manually emulating it
		const getMax = (px, max) => (withoutEnlargement ? Math.min(px, max) : max);

		// max has priority over width/height
		if (max) {
			const meta = await sharp(infile).metadata();
			if (meta.width >= meta.height) {
				width = getMax(meta.width, max);
				height = null;
			} else {
				width = null;
				height = getMax(meta.height, max);
			}
		}

		// console.log(123, { width, height, fit, withoutEnlargement, background });

		await sharp(infile)
			.resize({ width, height, fit, withoutEnlargement, background })
			.toFile(outfile);

		// purge after resize (required when deleting right after upload)
		sharp.cache(false);

		return true;
	}

	/**
	 * https://github.com/kodie/md5-file/blob/master/index.js
	 * @param filename
	 * @param algo
	 */
	static async hashFile(
		filename,
		algo: 'md5' | 'sha256' | 'sha512' = 'md5'
	): Promise<string> {
		return new Promise((resolve, reject) => {
			const output = crypto.createHash(algo);
			const input = fs.createReadStream(filename);

			input.on('error', (err) => {
				reject(err);
			});

			output.once('readable', () => {
				resolve(output.read().toString('hex'));
			});

			input.pipe(output);
		});
	}
}
