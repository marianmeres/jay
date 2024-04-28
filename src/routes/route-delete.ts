import { NextFunction, Request, Response } from 'express';
import { Config } from '../config.js';
import { ApiServerLocals } from '../lib/api-server.js';
import { STATUS } from '../lib/constants.js';
import { Api } from '../services/api.js';
import { Asset } from '../services/asset.js';
import { Crud } from '../services/crud.js';
import { Token } from '../services/token.js';

export const routeDelete = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { entity, id } = req.params;
		const { project } = res.locals as ApiServerLocals;

		const repo = await Crud.factoryRepository(entity, project);

		// problem: svoje vlastne zaznamy musi byt mozne zmazat aj ked na
		// entity urovni je mazanie ako take zakazane...
		const model = await repo.findOne(id, true);
		const identity = await Token.getToken(Api.getToken(req));
		const doAssertHasAccess = !(model._owner && identity && model._owner === identity.id);

		if (doAssertHasAccess) {
			await Api.assertHasAccess(entity, req, Api.ACTION_DELETE, project);
		}

		// asset special case
		if (entity === Config.ENTITY_ASSET) {
			// const model = await repo.findOne(id, true);
			// delete asset model
			await repo.delete(id);
			// now we need to find out if we can safely delete
			// the asset file (it could be referenced from other assets as well)
			const canDeleteAssetFiles = !(await repo.count((m) => m._hash === model._hash));
			if (canDeleteAssetFiles) {
				await Asset.unlinkAssetFile(model._hash, project.config.uploadDir);
			}
		}
		// "regular" cms object - basic strategy
		else {
			await repo.delete(id);
		}

		res.status(STATUS.NO_CONTENT).send();
	} catch (e) {
		next(e);
	}
};
