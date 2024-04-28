import * as fs from 'fs';
import { red } from 'kleur/colors';
import { LRUCache } from 'lru-cache';
import path from 'node:path';
import util from 'util';
import { Config } from '../config.js';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

export interface TokenData {
	id: string;
	role: string;
	email: string;
	projectId: string;
}

const TOKENS = new LRUCache<string, TokenData>({ max: 100, ttl: 1000 * 60 * 60 * 24 });
const TOKENS_CACHE_FILE = path.join(Config.CMS_TEMP_DIR, 'tokens.json');

export class Token {
	private static _loaded = false;

	static async getToken(key: string): Promise<TokenData> {
		if (!Token._loaded) {
			await Token.load();
		}
		return TOKENS.get(key);
	}

	static async setToken(token: string, tokenData: TokenData, persist = true) {
		const { role, id, email, projectId } = tokenData;
		const result = TOKENS.set(token, { id, role, email, projectId });
		if (persist) await Token.persist();
		return result;
	}

	static async reset() {
		await Token.persist(true);
		return TOKENS.clear();
	}

	static async persist(reset = false) {
		try {
			await writeFile(
				TOKENS_CACHE_FILE,
				JSON.stringify(reset ? [] : TOKENS.dump(), null, '\t')
			);
			return true;
		} catch (err) {
			console.error(red(`UNABLE TO PERSIST TOKENS: ${err.toString()}`));
		}
	}

	static async load() {
		try {
			TOKENS.load(JSON.parse(await readFile(TOKENS_CACHE_FILE, 'utf-8')));
			Token._loaded = true;
			return true;
		} catch (err) {
			console.error(red(`UNABLE TO LOAD TOKENS: ${err.toString()}`));
		}
	}
}
