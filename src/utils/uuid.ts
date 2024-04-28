import { v4 } from '@lukeed/uuid';
import { uid as _uid } from 'uid';

// just a centralized proxy open to future implementation modifications

export const uid = _uid;
export const uuid = v4;

// prefixing model uid with timestamp, so it's more human friendly (naturally sorted)
// when looking at the filestystem
export const modelUid = () => {
	const s = Math.floor(Date.now() / 1000) + _uid().toUpperCase();
	// xxxx-xxxx-xxxx-xxxx
	return s
		.match(/.{1,4}/g)
		.slice(0, 4)
		.join('-');
};
