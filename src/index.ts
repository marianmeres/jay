console.clear();

//
import { createClog } from '@marianmeres/clog';
import { parseBoolean } from '@marianmeres/parse-boolean';
import bodyParser from 'body-parser';
import compression from 'compression';
import express from 'express';
import { bold, gray, green, red, yellow } from 'kleur/colors';
import isEmpty from 'lodash/isEmpty.js';
import tinydate from 'tinydate';
import { Config } from './config.js';
import { createApiServer } from './lib/api-server.js';
import { Api } from './services/api.js';
import { Project } from './services/project.js';
import { sleep } from './utils/sleep.js';

const clog = createClog('index');

//
const {
	HOST,
	PORT,
	CONSOLE_LOG_REQUESTS,
	ADMIN_ENABLED,
	ADMIN_MOUNT,
	ADMIN_DIST_DIR,
	LEGACY_ADMIN_ENABLED,
	LEGACY_ADMIN_MOUNT,
	LEGACY_ADMIN_DIST_DIR,
	CMS_PROJECTS,
} = Config;

//
const app = express();
app.disable('x-powered-by');
app.use(compression(), bodyParser.json());

//  logging middleware
app.use((req, res, next) => {
	if (CONSOLE_LOG_REQUESTS) {
		const start = Date.now();
		res.on('finish', () => {
			const code = res.statusCode >= 400 ? red(res.statusCode) : res.statusCode;
			const token = Api.parseBearerToken(req.headers.authorization).slice(0, 6);
			const auth = token ? yellow(` (${token}...)`) : '';
			const dur = ` (${Date.now() - start} ms)`;
			clog.debug(`${code} ${req.method.toUpperCase()} ${req.originalUrl}${dur}${auth}`);
		});
	}
	next();
});

//
app.get('/', async (req, res) => {
	let projects = [];
	for (let { id } of CMS_PROJECTS) projects.push(await Project.readPublicConfig(id));
	res.json({ projects });
});

//
if (!isEmpty(CMS_PROJECTS)) {
	app.use('/:project/api', createApiServer(app));
	CMS_PROJECTS.forEach(({ id: projectId, publicDir }) => {
		app.use(`/${projectId}`, express.static(publicDir, { dotfiles: 'deny' }));
	});
} else {
	clog.error('Empty CMS_PROJECTS config...');
}

// always mount admin SPA client unless not explicitely disabled
if (parseBoolean(ADMIN_ENABLED)) {
	clog.debug(`Mounted ${ADMIN_MOUNT}`);
	app.use(ADMIN_MOUNT, express.static(ADMIN_DIST_DIR, { dotfiles: 'deny' }));
}

// deprecated legacy client
if (parseBoolean(LEGACY_ADMIN_ENABLED)) {
	clog.debug(`Mounted ${LEGACY_ADMIN_MOUNT}`);
	clog(LEGACY_ADMIN_MOUNT, LEGACY_ADMIN_DIST_DIR);
	app.use(
		LEGACY_ADMIN_MOUNT,
		express.static(LEGACY_ADMIN_DIST_DIR, { dotfiles: 'deny' })
	);
}

app.listen(PORT as any, HOST, () => {
	const ts = tinydate('({HH}:{mm}:{ss}) ')();
	clog(gray(`${ts}`) + green(bold(`Listening on http://${HOST}:${PORT} ...`)));
});
