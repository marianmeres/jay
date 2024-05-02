import cors from 'cors';

export const corsFn = cors({ origin: (origin, cb) => cb(null, true), credentials: true });
