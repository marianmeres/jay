import { createClog } from '@marianmeres/clog';
import { NextFunction, Request, Response } from 'express';
import { gray, magenta } from 'kleur/colors';
import _ from 'lodash';
import { Config } from '../config.js';
import { ApiServerLocals } from '../lib/api-server.js';
import { Forbidden } from '../utils/errors.js';

const clog = createClog(magenta('route-store-merge'));

export const routeDangerousStoreMerge = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		// be careful!
		if (Config.IS_PRODUCTION) throw new Forbidden();

		clog.warn(gray(`Hacking store with: ${JSON.stringify(req.body)}`));

		const { project } = res.locals as ApiServerLocals;
		project.store = _.merge({}, project.store, req.body || {});

		res.json(project.store);
	} catch (e) {
		next(e);
	}
};
