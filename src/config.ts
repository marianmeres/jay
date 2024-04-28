import dotenv from 'dotenv';
dotenv.config();

import { createClog } from '@marianmeres/clog';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { Project, ProjectConfig } from './services/project.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const clog = createClog('config');

let {
	PORT = 3100,
	HOST = '0.0.0.0',
	NODE_ENV = 'production',
	//
	SRC_DATA_DIR = 'data',
	CMS_TEMP_DIR = 'tmp',

	//
	ADMIN_ENABLED = 1,
	ADMIN_MOUNT = '/admin',
	ADMIN_DIST_DIR = '../client/dist',

	//
	LEGACY_ADMIN_ENABLED = 1,
	LEGACY_ADMIN_MOUNT = '/legacy-admin',
	LEGACY_ADMIN_DIST_DIR = '../_legacy-admin-client/public',
	//
	CONSOLE_LOG_REQUESTS = 1,
	//
} = process.env;

const PROJECT_ROOT_DIR = path.resolve(__dirname, '../');

// prettier-ignore
{
	SRC_DATA_DIR          = path.join(PROJECT_ROOT_DIR, SRC_DATA_DIR);
	CMS_TEMP_DIR          = path.join(PROJECT_ROOT_DIR, CMS_TEMP_DIR);
	ADMIN_DIST_DIR        = path.join(PROJECT_ROOT_DIR, ADMIN_DIST_DIR);
	LEGACY_ADMIN_DIST_DIR = path.join(PROJECT_ROOT_DIR, LEGACY_ADMIN_DIST_DIR);
}

// read and normalize cms_projects.config.json
let CMS_PROJECTS = JSON.parse(
	fs.readFileSync(path.join(PROJECT_ROOT_DIR, 'cms_projects.config.json'), 'utf8')
)
	.map(({ id, name, dataDir, publicDir, uploadDir }): ProjectConfig => {
		id = Project.normalizeName(id);
		const reserved = ['api', ADMIN_MOUNT.toLowerCase().replace('/', '')];
		if (reserved.includes(id)) {
			clog.error(`Reserved project id violation '${id}', skipping...`);
			return null;
		}

		// na poradi upload a public zalezi!
		uploadDir = path.join(PROJECT_ROOT_DIR, uploadDir || path.join(publicDir, 'uploads'));
		publicDir = path.join(PROJECT_ROOT_DIR, publicDir);

		const publicConfig = Project.readPublicConfigFileSync(publicDir);
		name = publicConfig.name || name || id;
		dataDir = path.join(PROJECT_ROOT_DIR, dataDir);

		return { id, name, dataDir, publicDir, uploadDir };
	})
	.filter(Boolean);

// single source of truth... (providing defaults with actual .env and process.env lookup)
// Note: nizsie davam ako class lebo IDE-cko s tym lepsie vie pracovat...
export class Config {
	static readonly PORT = PORT;
	static readonly HOST = HOST;
	static readonly NODE_ENV = NODE_ENV;
	static readonly IS_PRODUCTION = /production/i.test(NODE_ENV);

	//
	static readonly SRC_DATA_DIR = SRC_DATA_DIR;

	static readonly CMS_PROJECTS: ProjectConfig[] = CMS_PROJECTS as any;
	static readonly CMS_TEMP_DIR = CMS_TEMP_DIR;

	static readonly ADMIN_ENABLED = ADMIN_ENABLED;
	static readonly ADMIN_MOUNT = ADMIN_MOUNT;
	static readonly ADMIN_DIST_DIR = ADMIN_DIST_DIR;

	static readonly LEGACY_ADMIN_ENABLED = LEGACY_ADMIN_ENABLED;
	static readonly LEGACY_ADMIN_MOUNT = LEGACY_ADMIN_MOUNT;
	static readonly LEGACY_ADMIN_DIST_DIR = LEGACY_ADMIN_DIST_DIR;

	static readonly CONSOLE_LOG_REQUESTS = CONSOLE_LOG_REQUESTS;

	// special case-s
	static readonly ENTITY_USER = '_user';
	static readonly ENTITY_ASSET = '_asset';
	static readonly ENTITY_TEST = 'test';
}

// quick config sanity checks on first boot...
const assertDirExists = (name, path) => {
	if (!fs.existsSync(path)) {
		clog.error(`FATAL: Directory for '${name}' does not exists... (${path})`);
		process.exit(1);
	} else {
		clog.debug(`✓ ${name}: ${path}`);
	}
};

Object.entries({
	SRC_DATA_DIR: Config.SRC_DATA_DIR,
	CMS_TEMP_DIR: Config.CMS_TEMP_DIR,
}).forEach(([name, path]) => assertDirExists(name, path));

(CMS_PROJECTS as any).forEach(({ id, dataDir, publicDir }) => {
	[dataDir, publicDir].forEach((path) => assertDirExists(id, path));
});