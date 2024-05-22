# @marianmeres/jay

The Naive, the JSON, the CMS.

## What is this about?

### The CMS

_Jay_ is a Node.js-based generic CMS server that provides a REST interface for managing and serving any documents and assets. It features a basic CRUD authentication system and allows document types and schemas to be defined using YAML definition files, ensuring proper validation.

A single _Jay_ server instance can support multiple isolated projects, each independently configurable with ease.

Notably, _Jay_ operates without the need for a traditional database.

### The JSON

All document data is serialized to the filesystem as well-formatted JSON files, which can be manually edited if needed.

Asset source files are efficiently stored in a separate configured directory. Additionally, images are automatically recognized and stored with resized variants.

### The Naive

_Jay_ maintains all data in memory, with serialization to disk occurring only during write operations. This design choice results in high performance but limits scalability.

For managing a vast number of documents, handling numerous concurrent write operations, or distributing multiple instances across multiple nodes, alternative solutions should be considered.

## GUI

_Jay_ comes with a bundled brother _Joy_ -- a nice modern admin GUI, mounted on the `/admin/` path by default. This GUI is an ongoing work-in-progress and is not open source.

## Use case

You may not have access to a DB on the server but still need to reliably read/write some data... You may want to version your schemas and data in a git repo instead of worrying about sql backups and migrations... You may want to generate some static but data-driven output locally (e.g. static website)...

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
- `/home/foo/projects/bar/public/uploads/`.

2. Edit `projects.config.json` and add a new project:

```json
[
	// ...,
	{
		"id": "my-project",
		"name": "My Project",
		"dataDir": "/home/foo/projects/bar/data/",
		"publicDir": "/home/foo/projects/bar/public/" // note, that we're not adding the "uploads" segment here
	}
]
```

3. Create any yaml definition files describing your data structure. For now, look into the `_cms-data-demo` for inspiration. At very minimum, copy the `_user.yaml` and `_user/[whatever-the-id-is].json` to your new project's data dir. Edit the user json file by hand to fit your needs, mainly the `__password` key with some bcrypt value. You may use `npm run pswhash my-secret` as a helper here.

4. Restart the server and your REST API should be working. Refresh you admin GUI to reload project configuration and select "My Project" from the projects list.
