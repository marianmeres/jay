import { Request } from 'express';
import _ from 'lodash';
import { Forbidden } from '../utils/errors.js';
import { ModelLike } from '../utils/repository.js';
import { Project } from './project.js';
import { Token } from './token.js';

export class Api {
	static readonly ACTION_CREATE = 'create';
	static readonly ACTION_READ_ALL = 'read_all';
	static readonly ACTION_READ_ONE = 'read_one';
	static readonly ACTION_UPDATE = 'update';
	static readonly ACTION_DELETE = 'delete';

	static readonly IDENTITY_AUTHENTICATED = 'authenticated';
	static readonly IDENTITY_PUBLIC = 'public';

	static readonly ROLE_ADMIN = 'admin';
	static readonly ROLE_EDITOR = 'editor';

	static getToken(req: Request) {
		return Api.parseBearerToken(req?.headers?.authorization);
	}

	static async isAuthenticated(req: Request) {
		return (await Api.getIdentityType(req)) === Api.IDENTITY_AUTHENTICATED;
	}

	static async isAuthenticatedAs(req: Request, agencyId, eventId?) {
		// const tokenData =
		// 	(await Token.getTokenData(agencyId, Api.getToken(req))) || ({} as TokenData);
		// agencyId check
		// if (tokenData.agencyId != agencyId) return false;
		// new: eventId check...
		// if (eventId) return tokenData.events.includes(parseInt(eventId, 10));
		//
		// return true;
		// return ((await Token.getTokenData(Api.getToken(req))) || {}).agencyId == agencyId;
	}

	static async getIdentityType(req: Request) {
		// tu pozerame iba ci token existuje... a nie aky ma obsah
		return (await Token.getToken(Api.getToken(req)))
			? Api.IDENTITY_AUTHENTICATED
			: Api.IDENTITY_PUBLIC;
	}

	static async hasAccess(entity, identityType, action, project: Project) {
		// return !!_.at(store.access, `${entity}.${identityType}.${action}`)[0];
		// najskor public a potom ostatne (teda authenticated)... t.j. authenticated
		// moze mat len vyssie prava ako public, nikdy nie naopak
		return !!(
			_.at(project.store.access, `${entity}.public.${action}`)[0] ||
			_.at(project.store.access, `${entity}.${identityType}.${action}`)[0]
		);
	}

	static async assertHasAccess(entity, identityTypeOrReq, action, project: Project) {
		let identityType;
		if (typeof identityTypeOrReq === 'string') {
			identityType = identityTypeOrReq;
		} else {
			identityType = await Api.getIdentityType(identityTypeOrReq);
			// special case check...
			if (await Api.isAdmin(identityTypeOrReq)) return;
		}

		if (!(await Api.hasAccess(entity, identityType, action, project))) {
			throw new Forbidden();
		}
	}

	static async isAdmin(req) {
		return ((await Token.getToken(Api.getToken(req))) || {}).role === Api.ROLE_ADMIN;
	}

	static outputModel(model: ModelLike) {
		// filter double underscored..
		return _.omitBy(model, (value, key) => /^__/.test(key));
	}

	static outputCollection(coll: any[]) {
		return (coll || []).map(Api.outputModel);
	}

	static authBearer(token) {
		return { Authorization: `Bearer ${token}` };
	}

	static authBasic(name, password) {
		return {
			Authorization: `Basic ` + Buffer.from(`${name}:${password}`).toString('base64'),
		};
	}

	static parseBearerToken(headerAuthorizationValue) {
		const match = (headerAuthorizationValue || '').trim().match(/^Bearer (.+)$/i);
		return match ? match[1] : '';
	}
}
