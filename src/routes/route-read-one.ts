import { NextFunction, Request, Response } from 'express';
import { ApiServerLocals } from '../lib/api-server.js';
import { Api } from '../services/api.js';
import { Crud } from '../services/crud.js';

export const routeReadOne = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { entity, id } = req.params;
		const { project } = res.locals as ApiServerLocals;

		await Api.assertHasAccess(entity, req, Api.ACTION_READ_ONE, project);
		const repo = await Crud.factoryRepository(entity, project);

		res.json(Api.outputModel(await repo.findOne(id, true)));
	} catch (e) {
		next(e);
	}
};
