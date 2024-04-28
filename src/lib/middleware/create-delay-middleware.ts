const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const createDelayMiddleware = (ms) => async (req, res, next) => {
	await delay(ms);
	return next();
};
