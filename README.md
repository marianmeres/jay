# @marianmeres/jay

The Naive, the JSON, the CMS.

## About

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

## Installation instructions

Comming soon...
