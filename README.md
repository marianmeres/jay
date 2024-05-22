# @marianmeres/jay

The Naive, the JSON, the CMS.

## About

### The CMS

_Jay_ is a Node.js-based CMS server that provides a REST interface for managing and serving any documents and assets. It features a basic CRUD authentication system and allows document types and schemas to be defined using YAML definition files, ensuring proper validation.

A single _Jay_ server instance can support multiple isolated projects, each configurable with ease.

Notably, _Jay_ operates without the need for a traditional database.

### The JSON

All document data is serialized to the filesystem as well-formatted JSON files, which can be manually edited if needed.

Asset source files are efficiently stored in a separate configured directory, avoiding duplication. Additionally, images are automatically recognized and stored with resized variants.

### The Naive

_Jay_ maintains all data in memory, with serialization to disk occurring only during write operations. This design choice results in high performance but limits scalability.

For managing a vast number of documents, handling numerous concurrent write operations, or distributing multiple instances across multiple nodes, alternative solutions should be considered.

## The built-in admin GUI

_Jay_ comes with a bundled brother _Joy_ - a nice admin GUI. This GUI is an ongoing work-in-progress and not open source.

## Installation instructions

Comming soon...
