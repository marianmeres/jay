import { NextFunction, Request, Response } from 'express';
import { Api } from '../services/api.js';
import { Crud } from '../services/crud.js';
import { ApiServerLocals } from '../lib/api-server.js';

export const routeReadAll = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { entity } = req.params;
		const { project } = res.locals as ApiServerLocals;
		const { limit, offset } = req.query as any;

		await Api.assertHasAccess(entity, req, Api.ACTION_READ_ALL, project);
		const repo = await Crud.factoryRepository(entity, project);

		const { rows, meta } = await repo.findAll(
			null,
			parseInt(limit || 0),
			parseInt(offset || 0)
		);

		res.json({ rows: Api.outputCollection(rows), meta });
	} catch (e) {
		next(e);
	}
};
