export class NotFound extends Error {
	code = 404;
	message = 'Not found';
}

export class Forbidden extends Error {
	code = 403;
	message = 'Forbidden';
}

export class Unauthorized extends Error {
	code = 401;
	message = 'Unauthorized';
}
