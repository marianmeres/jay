import { Api } from '../../services/api.js';
import { Forbidden, NotFound } from '../../utils/errors.js';
import { Token } from '../../services/token.js';
import { ApiServerLocals } from '../api-server.js';

export const assertValidTokenProjectId = async (req, res, next) => {
	const { project } = res.locals as ApiServerLocals;
	const token = Api.getToken(req);
	if (token) {
		// ak posielame zly token, projectId moze byt undefined... co ale na Forbidden
		// vysledku nic nemeni
		const { projectId } = (await Token.getToken(token)) || {};
		if (project.config.id !== projectId) {
			const e = new Forbidden();
			e.message = `Project id mismatch: '${project.config.id}' vs '${projectId}'`;
			return next(e);
		}
	}
	next();
};
