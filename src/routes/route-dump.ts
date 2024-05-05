import { NextFunction, Request, Response } from 'express';
import { Api } from '../services/api.js';
import { Crud } from '../services/crud.js';
import { Schema } from '../services/schema.js';
import { Config } from '../config.js';
import fs from 'fs';
import path from 'node:path';
import { LRUCache } from 'lru-cache';
import { TokenData } from '../services/token.js';
import { ApiServerLocals } from '../lib/api-server.js';

const svgCache = new LRUCache<string, TokenData>({
	max: 500,
	ttl: 1000 * 60 * 60 * 24,
});

/**
 * Read all from all public readable collections
 * @param req
 * @param res
 * @param next
 */
export const routeDump = async (req: Request, res: Response, next: NextFunction) => {
	const { project } = res.locals as ApiServerLocals;
	try {
		let schema: any = await Schema.getSchema(project, null);
		const entities = Object.keys(schema.definitions);
		let out: any = {};

		let blacklist = [];
		let whitelist;

		if (req.query.blacklist) {
			blacklist = `${req.query.blacklist}`.split(',').filter(Boolean);
		}
		if (req.query.whitelist) {
			whitelist = `${req.query.whitelist}`.split(',').filter(Boolean);
		}

		for (let entity of entities) {
			if (blacklist.includes(entity)) {
				continue;
			}
			if (whitelist && !whitelist.includes(entity)) {
				continue;
			}
			// prettier-ignore
			if (await Api.hasAccess(entity, await Api.getIdentityType(req), Api.ACTION_READ_ALL, project)) {
				const repo = await Crud.factoryRepository(entity, project);
				// return id based map instead of collection
				out[entity] = Api.outputCollection((await repo.findAll()).rows).reduce(
					(memo, row) => ({ ...memo, [row.id]: row }),
					{}
				);
			}
		}

		// special case hack to embed svg...
		if (out[Config.ENTITY_ASSET] && req.query.embed_svg) {
			out[Config.ENTITY_ASSET] = Object.entries(out[Config.ENTITY_ASSET]).reduce(
				(memo, [id, _a]) => {
					let a: any = _a;
					if (a._mime === 'image/svg+xml') {
						a.__embed__ =
							svgCache.get(a._assetFilename) ||
							fs.readFileSync(
								path.join(project.config.uploadDir, a._assetFilename),
								'utf-8'
							);
						svgCache.set(a._assetFilename, a.__embed__);
					}
					memo[id] = a;
					return memo;
				},
				{}
			);
		}

		res.json(out);
	} catch (e) {
		next(e);
	}
};
