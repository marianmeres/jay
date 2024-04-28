import { Project } from '../../services/project.js';

export const factorySharedProjectInstance = async (req, res, next) => {
	try {
		res.locals.project = await Project.factorySharedInstance(
			Project.getEnvConfig(req?.params?.project)
		);
		next();
	} catch (e) {
		next(e);
	}
};
