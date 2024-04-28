import { createClog } from '@marianmeres/clog';
import bcrypt from 'bcrypt';
import FormData from 'form-data';
import fs from 'fs';
import { get, post } from 'httpie';
import _ from 'lodash';
import path from 'node:path';
import { totalist } from 'totalist/sync/index.js';
import { Config } from '../config.js';
import { API_CMS_PREFIX, ROUTE } from '../lib/api-server.js';
import { STATUS } from '../lib/constants.js';
import { UserModel } from '../lib/types.js';
import { AssetModel } from '../services/asset.js';
import { Project } from '../services/project.js';
import { ModelLike } from '../utils/repository.js';
import { modelUid } from '../utils/uuid.js';

const clog = createClog('_test-util');

export const TEST_USER_ID = '0000-1111-2222-3333-4444';
export const TEST_USER_EMAIL = 'foo@example.com';
export const TEST_USER_PASSWORD = 'foo-bar-baz-bat';

export const API = `http://0.0.0.0:${Config.PORT}/test/api`;
export const API_CMS = `http://0.0.0.0:${Config.PORT}/test/api${API_CMS_PREFIX}`;

export const API_ENT_TEST = `${API_CMS}/${Config.ENTITY_TEST}`;
export const API_ENT_ASSET = `${API_CMS}/${Config.ENTITY_ASSET}`;
export const API_ENT_USER = `${API_CMS}/${Config.ENTITY_USER}`;

export interface TestModel extends ModelLike {
	_special: string;
	__hidden: string;
	__password: string;
}

const { dataDir } = Project.getEnvConfig('test');
export const CMS_USER_ENTITY_DIR = path.join(dataDir, Config.ENTITY_USER);
export const CMS_ASSET_ENTITY_DIR = path.join(dataDir, Config.ENTITY_ASSET);
export const CMS_TEST_ENTITY_DIR = path.join(dataDir, Config.ENTITY_TEST);

export class TestUtil {
	static cleanUpTestModels(exceptIds = []) {
		// never clean up foo - test depends on it
		// exceptIds.push('foo');
		const removed = [];

		totalist(CMS_TEST_ENTITY_DIR, (rel, abs, stats) => {
			const depth = (rel.replace(/\\/g, '/').match(/\//g) || []).length;
			if (/\.json$/.test(rel) && depth === 0) {
				const id = path.basename(rel, '.json');
				if (!exceptIds.includes(path.basename(id))) {
					fs.unlinkSync(abs);
					removed.push(rel);
				}
			}
		});

		return removed;
	}

	static async uploadFile(srcFile, data): Promise<AssetModel> {
		await TestUtil.hackAccessFor(Config.ENTITY_ASSET, {
			public: {
				create: true,
				read_one: true,
				read_all: true,
				update: true,
				delete: true,
			},
		});
		return new Promise((resolve, reject) => {
			const form = new FormData();
			Object.entries(data || {}).forEach(([k, v]) => {
				form.append(k, v);
			});
			form.append('uploads', fs.createReadStream(srcFile));
			form.submit(API + ROUTE.UPLOAD, (err, res) => {
				if (err) return reject(err);
				if (res.statusCode !== STATUS.CREATED) {
					reject(new Error(`Unexpected status: ${res.statusCode} ${res.statusMessage}`));
				}
				res.on('data', (chunk) => {
					try {
						resolve(JSON.parse(chunk)[0]);
					} catch (e) {
						reject(e);
					}
				});
			});
		});
	}

	static async assertStatus(statusCode, promise) {
		const msg = (actual) => `Expecting statusCode "${statusCode}" instead of "${actual}"`;
		let r;

		try {
			r = await Promise.resolve(promise);
		} catch (err) {
			if (err.statusCode !== statusCode) {
				throw new Error(msg(err.statusCode));
			}
			return null;
		}

		if (r.statusCode !== statusCode) {
			throw new Error(msg(r.statusCode));
		}

		return r;
	}

	static refreshCache = async () => (await get(API + ROUTE._REFRESH)).data;

	static createTestUser(data?: UserModel) {
		return _.merge({}, data || {}, {
			id: TEST_USER_ID,
			email: TEST_USER_EMAIL,
			__password: bcrypt.hashSync(TEST_USER_PASSWORD, 10),
			role: 'editor',
		});
	}

	static async createTestUserJsonFile(data?: UserModel, refresh = false) {
		data = TestUtil.createTestUser(data);
		fs.mkdirSync(CMS_USER_ENTITY_DIR, { recursive: true });
		fs.writeFileSync(
			`${CMS_USER_ENTITY_DIR}/${data.id}.json`,
			JSON.stringify(data, null, '\t')
		);
		refresh && (await TestUtil.refreshCache());
		return data;
	}

	static async removeTestUserJsonFile(refresh = false) {
		try {
			fs.unlinkSync(`${CMS_USER_ENTITY_DIR}/${TEST_USER_ID}.json`);
		} catch (e) {}
		refresh && (await TestUtil.refreshCache());
	}

	static async createTestModelJsonFile(data, refresh = false) {
		data = data || {};
		data.id = data.id || modelUid();
		fs.mkdirSync(CMS_TEST_ENTITY_DIR, { recursive: true });
		fs.writeFileSync(
			`${CMS_TEST_ENTITY_DIR}/${data.id}.json`,
			JSON.stringify(data, null, '\t')
		);
		refresh && (await TestUtil.refreshCache());
		return data.id;
	}

	static async createFooJsonFile(refresh = false) {
		const srcPath = path.join(Config.SRC_DATA_DIR, 'foo.json');
		const destPath = path.join(CMS_TEST_ENTITY_DIR, 'foo.json');
		fs.mkdirSync(CMS_TEST_ENTITY_DIR, { recursive: true });
		fs.copyFileSync(srcPath, destPath);
		refresh && (await TestUtil.refreshCache());
	}

	static async hackAccessFor(entity, data) {
		if (Config.IS_PRODUCTION) throw new Error('Forbidden in production');
		return (
			await post(API + ROUTE._STORE, {
				body: {
					access: {
						[entity]: _.merge({}, data || {}),
					},
				},
			})
		).data;
	}
}
