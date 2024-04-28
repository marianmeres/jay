import { createClog } from '@marianmeres/clog';
import { NextFunction, Request, Response } from 'express';
import formidable from 'formidable';
import { Config } from '../config.js';
import { ApiServerLocals } from '../lib/api-server.js';
import { STATUS } from '../lib/constants.js';
import { Api } from '../services/api.js';
import { Asset, AssetModel } from '../services/asset.js';
import { Crud } from '../services/crud.js';

const clog = createClog('route-upload');

export const routeUpload = async (req: Request, res: Response, next: NextFunction) => {
	const { project } = res.locals as ApiServerLocals;

	const form = formidable({
		multiples: true,
		uploadDir: Config.CMS_TEMP_DIR,
		keepExtensions: true,
	});

	// const skipHasAccessCheck = /007/.test(req.headers.referer);
	// const skipHasAccessCheck = !/production/i.test(process.env.NODE_ENV);
	const skipHasAccessCheck = false;

	const isIterable = (o: any) => (o ? typeof o[Symbol.iterator] === 'function' : false);

	try {
		!skipHasAccessCheck &&
			(await Api.assertHasAccess(Config.ENTITY_ASSET, req, Api.ACTION_CREATE, project));

		const repo = await Crud.factoryRepository<AssetModel>(Config.ENTITY_ASSET, project);

		form.parse(req, async (err, fields, files) => {
			if (err) {
				return next(err);
			}

			const assets = [];

			// prettier-ignore
			for (let [k, v] of Object.entries(fields)) {
				// I'm not sure if this is a bug or a feature, but I'm getting the
				// values as array... so, lets defensively convert it back
				if (Array.isArray(v) && v.length === 1) {
					v = v[0];
					fields[k] = v;
				}

				// it the client will be sending any non-primitive data, they will come
				// as serialized jsons... so let's try to parse it automatically
				try { fields[k] = JSON.parse(v as any); } catch (e) {}
			}

			try {
				for (let [key, list] of Object.entries(files)) {
					if (!isIterable(list)) list = [list as any];
					for (let file of list as any) {
						const asset = await Asset.createAssetFile(
							file.filepath,
							fields,
							project.config.uploadDir,
							true
						);
						// hack to preserve original name (provided by formidable,
						// not Asset)
						asset._name = file.originalFilename;
						assets.push(asset);
					}
				}

				let coll = [];
				for (let model of assets) {
					coll.push(await repo.insert(model));
				}
				res.status(STATUS.CREATED).json(Api.outputCollection(coll));
				// res.json({ fields, files, out });
			} catch (e) {
				return next(e);
			}
		});
	} catch (e) {
		next(e);
	}
};
