import { NextFunction, Request, Response } from 'express';
import { Project } from '../services/project.js';
import { Schema } from '../services/schema.js';
import { Token } from '../services/token.js';

export const routeRefresh = async (req: Request, res: Response, next: NextFunction) => {
	try {
		Project.resetSharedInstances();
		await Token.reset();
		const project = await Project.factorySharedInstance(
			Project.getEnvConfig(req?.params?.project)
		);
		res.json(await Schema.getSchema(project));
	} catch (e) {
		next(e);
	}
};
