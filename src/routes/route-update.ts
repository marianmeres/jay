import { NextFunction, Request, Response } from 'express';
import { STATUS } from '../lib/constants.js';
import { Api } from '../services/api.js';
import { Crud } from '../services/crud.js';
import { Schema } from '../services/schema.js';
import { ApiServerLocals } from '../lib/api-server.js';

export const routeUpdate = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { entity, id } = req.params;
		const { project } = res.locals as ApiServerLocals;

		await Api.assertHasAccess(entity, req, Api.ACTION_UPDATE, project);
		const repo = await Crud.factoryRepository(entity, project);

		// sanity check (intentionally non-strict)... islo by to prepisat
		// (forcenut id z url), ale radsej kricat...
		if (id != req.body.id) {
			throw new Error(`Model id mismatch`);
		}

		// repo.update asserts model must exists
		const model = await repo.update(Crud.omitUnderscored(req.body));

		res.status(STATUS.OK).json(Api.outputModel(model));
	} catch (e) {
		next(e);
	}
};
