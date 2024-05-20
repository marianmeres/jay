console.clear();

//
import { createClog } from '@marianmeres/clog';
import bodyParser from 'body-parser';
import compression from 'compression';
import express from 'express';
import { bold, gray, green, red, yellow } from 'kleur/colors';
import isEmpty from 'lodash/isEmpty.js';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import tinydate from 'tinydate';
import { Config } from './config.js';
import { createApiServer } from './lib/api-server.js';
import { corsFn } from './lib/middleware/cors-fn.js';
import { Api } from './services/api.js';
import { Project } from './services/project.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clog = createClog(path.basename(fileURLToPath(import.meta.url)));

//
const { HOST, PORT, CONSOLE_LOG_REQUESTS, CMS_PROJECTS, HTTPS_CERT, HTTPS_KEY } = Config;

//
const app = express();
app.disable('x-powered-by');
app.use(compression(), bodyParser.json(), corsFn);

//  logging middleware
app.use((req, res, next) => {
	if (CONSOLE_LOG_REQUESTS) {
		const start = Date.now();
		res.on('finish', () => {
			const code = res.statusCode >= 400 ? red(res.statusCode) : res.statusCode;
			const token = Api.parseBearerToken(req.headers.authorization).slice(0, 6);
			const auth = token ? yellow(` (${token}...)`) : '';
			const dur = ` (${Date.now() - start} ms)`;
			clog.debug(
				gray(`${code} ${req.method.toUpperCase()} ${req.originalUrl}${dur}${auth}`)
			);
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

//
let server;
let isHttps = false;

//
if (HTTPS_CERT && HTTPS_KEY) {
	const _readFile = (name: string) => fs.readFileSync(path.join(process.cwd(), name));
	server = https.createServer(
		{ key: _readFile(HTTPS_KEY), cert: _readFile(HTTPS_CERT) },
		app
	);
	isHttps = true;
} else {
	server = http.createServer(app);
}

// start now
server.listen(PORT as any, HOST, () => {
	const ts = tinydate('({HH}:{mm}:{ss}) ')();
	clog(gray(`${ts}`) + green(bold(`✓ http${isHttps ? 's' : ''}://${HOST}:${PORT} ...`)));
});
