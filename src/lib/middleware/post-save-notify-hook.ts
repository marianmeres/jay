import { createClog } from '@marianmeres/clog';
import { get } from 'httpie';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const clog = createClog(path.basename(fileURLToPath(import.meta.url)));

/**
 * Pod "write" sa mysli akoze "create", "update" alebo "delete"
 * @param req
 * @param res
 * @param next
 */
export const postSaveNotifyHook = (req, res, next) => {
	res.on('finish', () => {
		const url = process.env.POST_SAVE_NOTIFY_HOOK_URL;
		if (res.statusCode <= 400 && url) {
			clog.debug(`postSaveNotifyHook... GET ${url}`);
			// intentionally do not await...
			get(url);
		}
	});
	next();
};
