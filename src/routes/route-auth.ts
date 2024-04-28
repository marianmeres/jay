import bcrypt from 'bcrypt';
import { NextFunction, Request, Response } from 'express';
import { Config } from '../config.js';
import { ApiServerLocals } from '../lib/api-server.js';
import { UserModel } from '../lib/types.js';
import { Crud } from '../services/crud.js';
import { Token } from '../services/token.js';
import { Unauthorized } from '../utils/errors.js';
import { uuid } from '../utils/uuid.js';

export const routeAuth = async (req: Request, res: Response, next: NextFunction) => {
	const { project } = res.locals as ApiServerLocals;
	try {
		const { email, password } = req.body;

		// "user" je v istom zmysle special case konvencna entita...
		const userRepo = await Crud.factoryRepository<UserModel>(Config.ENTITY_USER, project);

		const user = await userRepo.findOne({ email: `${email}`.toLowerCase() });
		if (!user) throw new Unauthorized();

		const match = await bcrypt.compare(password, user.__password);
		if (!match) throw new Unauthorized();

		const token = uuid();
		const tokenData = {
			projectId: project.config.id,
			id: user.id,
			role: user.role,
			email: user.email,
		};
		await Token.setToken(token, tokenData);

		res.json({ ...tokenData, token });
	} catch (e) {
		next(e);
	}
};
