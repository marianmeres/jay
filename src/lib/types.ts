import { ModelLike } from '../utils/repository.js';

export interface UserModel extends ModelLike {
	email: string;
	role: string;
	__password: string;
}
