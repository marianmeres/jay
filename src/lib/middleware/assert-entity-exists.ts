import _ from 'lodash';
import { Cms } from '../../services/cms.js';
import { NotFound } from '../../utils/errors.js';
import { ApiServerLocals } from '../api-server.js';

export const assertEntityExists = async (req, res, next) => {
	const { project } = res.locals as ApiServerLocals;
	if (
		!req?.params?.entity ||
		!(await Cms.entityExists(req.params.entity, project.store))
	) {
		return next(new NotFound());
	}
	next();
};
