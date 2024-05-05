const path = require('path');
const bcrypt = require('bcrypt');

const args = process.argv.slice(2);

if (!args[0]) {
	console.log(`Usage: node ${path.basename(__filename)} string-to-hash`);
	process.exit(1);
}

bcrypt.hash(args[0], 10, (err, hash) => {
	// console.log(args);
	console.log(err ? `Error: ${err}` : hash);
});
