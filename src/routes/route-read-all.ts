import { NextFunction, Request, Response } from 'express';
import { Api } from '../services/api.js';
import { Crud } from '../services/crud.js';
import { ApiServerLocals } from '../lib/api-server.js';

export const routeReadAll = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { entity } = req.params;
		const { project } = res.locals as ApiServerLocals;

		await Api.assertHasAccess(entity, req, Api.ACTION_READ_ALL, project);
		const repo = await Crud.factoryRepository(entity, project);

		res.json(Api.outputCollection(await repo.findAll()));
	} catch (e) {
		next(e);
	}
};
