import { ApiServerLocals } from '../lib/api-server.js';
import { NotFound } from '../utils/errors.js';

// toto by technicky mohlo ist cez public static, ale vnorene v CMS data
// mi to dava viac zmysel
export const routeReadme = (req, res, next) => {
	const { project } = res.locals as ApiServerLocals;
	res.sendFile('README.md', { root: project.config.dataDir }, (err) => {
		if (err) {
			next(err.code === 'ENOENT' ? new NotFound() : err);
		}
	});
};
