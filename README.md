# @marianmeres/jay

The Naive, the JSON, the CMS.

## What is this about?

Before we start, quick vocabulary context definition:

- **model** - data structure described by schema (in the DB context a table structure)
- **entity** - name of the model, which maps directly to the name of the YAML schema file (in the DB context a table name). May be used interchangeably with the term "document type".
- **document** - concrete "instance" of the model, also often thought of as a physical json file (in the DB context a row)
- **data** - the actual document data (`JSON.parse`-d json file)
- **collection** - list of document instances (in the DB context a set of rows)
- **asset** - a special case model, having both `data` (in whatever structure described by schema) and a physical file saved on disk, named by it's content hash.

All three words `model`, `entity` and `document` may and probably will be used inaccurately, but roughly describing the same thing.

### The CMS

_Jay_ is a generic CMS server that provides a REST interface for managing and serving any documents and assets. It features a basic CRUD authentication system and allows document types and schemas to be defined using YAML definition files, ensuring proper validation.

A single _Jay_ server instance can support multiple isolated projects, each independently configurable with ease.

Notably, _Jay_ operates **without the need for a traditional database**.

### The JSON

All documents are serialized to the filesystem as well-formatted JSON files. Every document json file can be safely edited by hand if needed (with one note, that server must be restarted afterwards).

Additionally, asset source files are efficiently stored in a separate configured directory. Images are treated with special care out of the box.

### The Naive

_Jay_ maintains all documents in memory, with serialization to disk occurring only during write operations. This design choice results in high performance but limits scalability.

For managing a vast number of documents, handling numerous concurrent write operations, or distributing multiple instances across multiple nodes, alternative solutions should be considered.

## GUI

_Jay_ comes bundled with it's brother _Joy_ -- a nice modern admin GUI, mounted on the `/admin/` path by default. This GUI is an ongoing work-in-progress (currently in an alpha stage) and is not open source.

## Use case

You may not have access to a DB on the server but still need to reliably read/write some data... You may want to version your schemas and data in a git repo instead of worrying about DB backups and SQL migrations... You may want to generate some static but data-driven output locally (e.g. generate static website)...

You simply may need a tiny and easy-to-configure yet still reliable REST API with GUI for whatever data driven needs.

## Installation (quick start)

1. `git clone https://github.com/marianmeres/jay.git`
2. `cd jay`
3. `npm install`
4. `cp projects.config.example.json projects.config.json`
5. `vim projects.config.json` (optional)
6. `cp .env.example .env`
7. `vim .env` (optional)
8. `npm run start`
9. open `http://localhost:6100/admin/` in your browser, add the default server and click on the "Demo project". Use `admin@example.com` and `this-user-should-be-deleted` as credentials.

## Creating a new project (docs will be improved)

This is a little bumpy for now... The detailed explanation on how to prepare the schema files will be added later.

1. Create 2 directories anywhere on your system. Make sure they are writable. For example:

- `/home/foo/projects/bar/data/`, and
- `/home/foo/projects/bar/public/uploads/` (it is currently required that the last segment is "uploads")

2. Edit `projects.config.json` and add a new project:

```json
[
	// ...,
	{
		"id": "my-project",
		"name": "My Project",
		"dataDir": "/home/foo/projects/bar/data/",
		"publicDir": "/home/foo/projects/bar/public/"
		// note, that we're not adding the "uploads" segment above
	}
]
```

3. Create any yaml definition files describing your models. Name of the yaml file will be the name of your entity. There are few entity names which are reserved (currently `_user` and `_asset`).
   <br /><br />For now, look into the `_cms-data-demo` folder for inspiration. At very minimum, copy the `_user.yaml` and `_user/[whatever-the-id-is].json` to your new project's data dir. Edit the user json file by hand to fit your needs, mainly the `__password` key with some bcrypt value. You may use `npm run pswhash [your-password]` as a helper here.

4. Now, restart the server and refresh your admin GUI browser window to reload project configuration and select "My Project" from the projects list and you should be good to go.

## The REST endpoints (docs will be improved)

Main collection and model endpoints. Whether they require authorized requests depends on the schema configuration.

- `/{PROJECT_ID}/api/_cms/{ENTITY}` (`limit` and `offset` query params are supported)
- `/{PROJECT_ID}/api/_cms/{ENTITY}/{DOCUMENT_ID}`

Auth endpoint:

- `/{PROJECT_ID}/api/auth`

Other misc (require HTTP bearer token):

- `/{PROJECT_ID}/api/schema.json`
- `/{PROJECT_ID}/api/upload`
- `/{PROJECT_ID}/api/dump`
- `/{PROJECT_ID}/api/readme`
- `/{PROJECT_ID}/api/__refresh__`
