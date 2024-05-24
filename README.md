# @marianmeres/jay

The Naive, the JSON, the CMS.

## What is Jay?

Before we start, quick vocabulary context definition:

- **model** - data structure described by schema (in the DB context a table structure),
- **entity** - type of the model (in the DB context a table name). May be used interchangeably with the term "document type",
- **document** - concrete "instance" of the model, persisted as a physical json file (in the DB context a row),
- **data** - somewhat vague, but mostly means some or all documents,
- **collection** - list of document instances (in the DB context a set of rows),
- **asset** - a special case model, having both `data` (in whatever structure described by schema) and a physical raw representation as a file saved on disk, named by it's content hash.

All three words `model`, `entity` and `document` may and probably will be used inaccurately, but are roughly describing the same thing.

### The "no DB" CMS

_Jay_ is a generic CMS server -- it provides a REST interface for managing and serving any documents and assets. It features a basic CRUD authentication system and allows the access rights and document schemas to be defined using YAML definition files (regular JSON schemas under the hood), ensuring proper validation. These same YAML files can also define some props for the frontend admin UI.

A single _Jay_ server instance can support multiple isolated projects, each independently configurable with ease.

Notably, _Jay_ operates **without the need for a traditional database**.

### The JSON

_Jay_ is a json files writer -- all documents are serialized to the filesystem as well-formatted json files. Every document json file can be safely edited by hand if needed. It should also be noted, that the raw json files are not statically served but are always processed (to be able to respect schema and more...).

Additionally, asset source files are efficiently stored in a separate configured directory. Images are treated with special care out of the box.

### The Naive

_Jay_ is an honest yet a bit naive servant -- it maintains all documents in memory, with serialization to disk occurring only during write operations. This design choice results in high performance but limits scalability.

For managing a vast number of documents, or the need to spawn multiple server instances across multiple nodes, alternative solutions should be considered.

## What is the use case?

When you may not have access to a DB on the server but still need to reliably read/write some data... When you may want to bundle (and to version) your schemas and data in a git repo instead of worrying about DB backups and SQL migrations...

When you simply need a tiny and easy-to-configure, yet still reliable REST API with GUI for whatever data driven needs.

## The admin GUI

_Jay_ comes bundled with it's brother _Joy_ -- a modern admin GUI, mounted on the `/admin/` path by default. This GUI is an ongoing work-in-progress (currently in an alpha stage) and is not open source.

## Installation (quick start)

1. `git clone https://github.com/marianmeres/jay.git`
2. `cd jay`
3. `npm install`
4. `cp projects.config.example.json projects.config.json`
5. `vim projects.config.json` (can be skipped if you want to play with the demo only)
6. `cp .env.example .env`
7. `vim .env` (optional if you're OK with the defaults)
8. `npm run start`
9. open `http://localhost:6100/admin/` in your browser, add the default server and click on the "Demo project". Use `admin@example.com` and `this-user-should-be-deleted` as credentials.

## Creating a new project (todo: improve docs)

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

3. Create any yaml definition files describing your models. Name of the yaml file will be the name of your entity. There are few entity names which are recognized by the system as a special cases (currently `_user` and `_asset`).
   <br /><br />
   For now, look into the `_cms-data-demo` folder for inspiration. At very minimum, copy the `_user.yaml` and `_user/[whatever-the-id-is].json` to your new project's data dir. Edit the user json file by hand to fit your needs, mainly the `__password` key with some bcrypt value. You may use `npm run pswhash [your-password]` as a helper here.

4. Now, restart the server and refresh your admin GUI browser window to reload project configuration and select "My Project" from the projects list and you should be good to go.

## The REST endpoints (todo: improve docs)

Main collection and model endpoints. Whether they require HTTP authorized requests depends on the schema configuration.

- `/{PROJECT_ID}/api/_cms/{ENTITY}` (`limit` and `offset` query params are supported)
- `/{PROJECT_ID}/api/_cms/{ENTITY}/{DOCUMENT_ID}`

Auth endpoint:

- `/{PROJECT_ID}/api/auth`

Other miscellaneous. You must use the HTTP baerer auth header (token can be acquired from the auth endpoint above):

- `/{PROJECT_ID}/api/schema.json`
- `/{PROJECT_ID}/api/upload`
- `/{PROJECT_ID}/api/dump`
- `/{PROJECT_ID}/api/readme`
- `/{PROJECT_ID}/api/__refresh__`

## Naming convention magic

There are few document props naming conventions which expose some handy features.

- `_startsWithUnderscore` prop name is considered as a **read-only** and the REST endpoint will NEVER allow it to be overwritten by user-land data. Some of such props are also built-in into every document (`_created_at`, `_updated_at`, `_owner`).
- `__startsWithDoubleUnderscore` prop name is considered as a **hidden** and will NEVER leave the server and will NEVER be overwritten by user-land data. Those props are simply filtered out for both incoming requests and outgoing responses. Typical example is a `__password` field of the `_user` model (leaving aside, that the actual `__password` value is a bcrypt hash, so even exposing it should not cause any harm).

Note that you can always edit the fields by hand in the actual json files (server restart is required for those changes to take effect).

---

### What does the word "Jay" means?

I had to ask our LLM friend. This is the answer.

The word "jay" has several meanings depending on the context:

- Bird: A "jay" is a type of bird known for its vibrant plumage and loud calls. Jays belong to the family Corvidae, which also includes crows and magpies.

- Slang Term: In North American slang, particularly in the past, a "jay" referred to an unsophisticated or naive person, often someone from a rural area who is unfamiliar with urban ways.

- Letter J: In some contexts, "jay" simply refers to the letter "J" in the English alphabet.

- Traffic Violation: The term "jaywalking" is derived from this word, referring to the act of crossing the street illegally or recklessly, often not at a designated crosswalk.
