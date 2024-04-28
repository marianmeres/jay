export const withQueryVars = (url: string, q?: object): string => {
	const vars = Object.entries(q || {})
		.reduce((memo, [key, val]) => {
			// opinionated: prazdne hodnoty zahadzujeme (hruby falsey nemozeme nizsie
			// pouzit, lebo napr: 0 nechceme zahodit)
			if (val === undefined || val === '' || val === null) {
				return memo;
			}
			memo.push([key, val].map(encodeURIComponent).join('='));
			return memo;
		}, [])
		// kozmetika: "normalizujeme" poradie, aby query string bol vzdy rovnaky a predvidatelny
		.sort((a, b) => a.localeCompare(b));

	if (vars.length) {
		url += (`${url}`.includes('?') ? '&' : '?') + vars.join('&');
	}

	return url as string;
};
