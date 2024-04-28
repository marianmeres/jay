import { Api } from '../../services/api.js';
import { Forbidden } from '../../utils/errors.js';

export const assertAuthenticated = async (req, res, next) => {
	next((await Api.isAuthenticated(req)) ? void 0 : new Forbidden());
};
