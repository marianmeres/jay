import { NextFunction, Request, Response } from 'express';
import { Schema } from '../services/schema.js';
import { ApiServerLocals } from '../lib/api-server.js';

export const routeSchema = async (req: Request, res: Response, next: NextFunction) => {
	const { project } = res.locals as ApiServerLocals;
	try {
		res.json(await Schema.getSchema(project, null, { clientMode: true }));
	} catch (e) {
		next(e);
	}
};
