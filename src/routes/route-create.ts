import { NextFunction, Request, Response } from 'express';
import { ApiServerLocals } from '../lib/api-server.js';
import { STATUS } from '../lib/constants.js';
import { Api } from '../services/api.js';
import { Crud } from '../services/crud.js';
import { Token } from '../services/token.js';

export const routeCreate = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { entity } = req.params;
		const { project } = res.locals as ApiServerLocals;

		await Api.assertHasAccess(entity, req, Api.ACTION_CREATE, project);

		// aktualne iba tu (pri create) posielame aj identitu (lebo "_owner")
		const repo = await Crud.factoryRepository(entity, project, {
			identity: await Token.getToken(Api.getToken(req)),
		});

		// vsetky validacie a zapisy riesi repo via hooky, konfigurovane cez vyssiu
		// faktory
		// POZOR: omitUnderscore moze byt aplikovatelne jedine tu a nie na low
		// level crud urovni...
		const model = await repo.insert(Crud.omitUnderscored(req.body));

		res.status(STATUS.CREATED).json(Api.outputModel(model));
	} catch (e) {
		next(e);
	}
};
