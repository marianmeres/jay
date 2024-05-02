import fs from 'fs';
import path from 'node:path';
import util from 'util';
import { Config } from '../config.js';
import { mmUnaccent } from '../lib/mm-unaccent.js';
import { NotFound } from '../utils/errors.js';
import { Cms, CmsStore } from './cms.js';

const readFile = util.promisify(fs.readFile);

export interface ProjectConfig {
	id: string;
	name: string;
	dataDir: string;
	publicDir: string;
	uploadDir: string;
	hidden?: boolean;
}

interface ProjectFactoryOptions {
	store: CmsStore;
}

export class Project {
	public readonly instanceCreatedAt = new Date(); // tmp debug

	// a.k.a. cache store
	protected static _instances = new Map<string, Project>();

	protected _publicConfig;

	protected constructor(
		public readonly config: ProjectConfig,
		public store: CmsStore
	) {}

	static async factory(
		config: ProjectConfig | string,
		options: Partial<ProjectFactoryOptions> = null
	) {
		// project name as config is supported
		if (typeof config === 'string') config = Project.getEnvConfig(config);
		return new Project(config, options?.store || (await Cms.createProjectStore(config)));
	}

	static async factorySharedInstance(
		config: ProjectConfig,
		options: Partial<ProjectFactoryOptions> = null
	) {
		if (!this._instances.has(config.id)) {
			this._instances.set(config.id, await Project.factory(config, options));
		}
		return this._instances.get(config.id);
	}

	static resetSharedInstances() {
		this._instances.clear();
	}

	async getPublicConfig() {
		if (!this._publicConfig) {
			this._publicConfig = await Project.readPublicConfig(this.config.id);
		}
		return this._publicConfig;
	}

	static normalizeName(str) {
		return mmUnaccent(str)
			.toLowerCase()
			.replace(/\s\s+/g, ' ') // multiple white space to one
			.trim()
			.replace(/[\W]/g, '-') // non-words to dash
			.replace(/\s/g, '-') // space to dash
			.replace(/--+/g, '-') // multiple dashes to one
			.replace(/([\-]*)$/g, '') // trim right trailing dashes
			.replace(/^([\-]*)/g, ''); // trim left beginning dashes
	}

	static getEnvConfig(projectId) {
		const cfg = Config.CMS_PROJECTS.find(
			({ id }) => id === Project.normalizeName(projectId)
		);
		if (!cfg) {
			const e = new NotFound();
			e.message = `Project not found (${projectId}).`;
			throw e;
		}
		return cfg;
	}

	static async readPublicConfig(projectId) {
		const { id, name, publicDir, hidden } = Project.getEnvConfig(projectId);
		return {
			id,
			name: name || id,
			hidden,
			...(await Project.readPublicConfigFile(publicDir)),
		};
	}

	static getPublicConfigFilename(publicDir) {
		return path.join(publicDir, 'config.json');
	}

	static async readPublicConfigFile(publicDir) {
		try {
			return JSON.parse(
				await readFile(Project.getPublicConfigFilename(publicDir), 'utf8')
			);
		} catch (e) {
			return {};
		}
	}

	static readPublicConfigFileSync(publicDir) {
		try {
			return JSON.parse(
				fs.readFileSync(Project.getPublicConfigFilename(publicDir), 'utf8')
			);
		} catch (e) {
			return {};
		}
	}
}
