import { createClog } from '@marianmeres/clog';
import { Renderer } from '@marianmeres/test-runner';
import { Application, Request, Response, Router } from 'express';
import { bold, gray } from 'kleur/colors';
import { Config } from '../config.js';
import { routeAuth } from '../routes/route-auth.js';
import { routeCreate } from '../routes/route-create.js';
import { routeDelete } from '../routes/route-delete.js';
import { routeDump } from '../routes/route-dump.js';
import { routeReadAll } from '../routes/route-read-all.js';
import { routeReadOne } from '../routes/route-read-one.js';
import { routeReadme } from '../routes/route-readme.js';
import { routeRefresh } from '../routes/route-refresh.js';
import { routeSchema } from '../routes/route-schema.js';
import { routeDangerousStoreMerge } from '../routes/route-store-merge.js';
import { routeUpdate } from '../routes/route-update.js';
import { routeUpload } from '../routes/route-upload.js';
import { Project } from '../services/project.js';
import { assertAuthenticated } from './middleware/assert-authenticated.js';
import { assertEntityExists } from './middleware/assert-entity-exists.js';
import { assertValidTokenProjectId } from './middleware/assert-valid-token-project-id.js';
import { factorySharedProjectInstance } from './middleware/factory-shared-project-instance.js';
import { postSaveNotifyHook } from './middleware/post-save-notify-hook.js';

const clog = createClog('api-server');

const PROD = /production/.test(process.env.NODE_ENV);

// to avoid resource name collision with system routes, it's easier to
// prefix (namespace) the userland than to dance around reserved names...
export const API_CMS_PREFIX = '/_cms';

//
const ROUTE_COLLECTION = API_CMS_PREFIX + '/:entity([$a-z0-9_-]+)';
const ROUTE_MODEL = ROUTE_COLLECTION + '/:id';

// prettier-ignore
export class ROUTE {
	static readonly AUTH     = '/auth';
	static readonly SCHEMA   = '/schema.json';
	static readonly UPLOAD   = '/upload';
	static readonly DUMP     = '/dump';
	static readonly README   = '/readme';
	static readonly _REFRESH = '/__refresh__';
	static readonly _STORE   = '/__store__';
}

export interface ApiServerLocals {
	project: Project;
}

export const createApiServer = (app: Application) => {
	const api = Router({ mergeParams: true });

	// important: will assert project name param and instantiate project
	api.use(factorySharedProjectInstance);

	//
	api.use(assertValidTokenProjectId);

	// "it works" project config
	api.get('/', async (req: Request, res: Response) => {
		res.json(await res.locals.project.getPublicConfig());
	});

	// "system" routes
	api.post(ROUTE.AUTH, routeAuth);
	api.get(ROUTE.SCHEMA, assertAuthenticated, routeSchema);
	api.get(ROUTE.DUMP, routeDump); // maybe assertAuthenticated?
	api.get(ROUTE.README, assertAuthenticated, routeReadme);
	api.post(ROUTE.UPLOAD, postSaveNotifyHook, routeUpload);
	api.get(ROUTE._REFRESH, routeRefresh);

	// CAUTION: dangerous (security wise) special case route for testing...
	// basically modifies the in-memory store, without serializing to filesystem
	if (!Config.IS_PRODUCTION) {
		clog.warn(`Hackable store...`);
		api.post(ROUTE._STORE, routeDangerousStoreMerge);
	}

	// create
	api.post(ROUTE_COLLECTION, assertEntityExists, postSaveNotifyHook, routeCreate);

	// "read all"
	api.get(ROUTE_COLLECTION, assertEntityExists, routeReadAll);

	// "read one"
	api.get(ROUTE_MODEL, assertEntityExists, routeReadOne);

	// update
	api.patch(ROUTE_MODEL, assertEntityExists, postSaveNotifyHook, routeUpdate);

	// delete
	api.delete(ROUTE_MODEL, assertEntityExists, postSaveNotifyHook, routeDelete);

	// last resource error handler
	api.use((err, req, res, next) => {
		const msg = err.message || err.statusMessage || err.toString();
		const code = err.code || err.status || err.statusCode || 500;
		clog.error(`${code} ${req.method.toUpperCase()} ${req.originalUrl} ${bold(msg)}`);
		code >= 500 && console.log(gray(Renderer.sanitizeStack(err.stack)));
		res.status(code).json({ error: msg });
	});

	return api;
};
