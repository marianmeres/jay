export interface Dictionary<T> {
	[key: string]: T;
}

export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
