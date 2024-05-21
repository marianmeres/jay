# @marianmeres/jay

The naive, the JSON, the CMS.

## About

### The CMS

_Jay_ is a simple, [express](https://expressjs.com/) based CMS server offering a basic REST interface for managing arbitrary documents and assets. It includes a basic CRUD authentication system. Document types and schemas are defined using YAML definition files, ensuring validation. One server instance is capable of handling multiple isolated projects, which can be configured with ease. Notably, _jay_ operates without the need for a traditional database.

### The JSON

All documents data are serialized to the filesystem in the form of a pretty printed JSON files, which can be edited by hand if needed.

Asset source files are saved to a separately configured directory. Images are automatically recognized and stored with resized variants as well.

### The naive

_Jay_ keeps all the data in memory, with serialization to disk occurring only during write operations. This design results in high speed but limited scalability. For managing many thousands of documents, perhaps many potential concurrent write operations or the need to distribute multiple server instances across multiple nodes, alternative solutions should be considered.

## The built in admin client GUI

The server comes with a built-in admin GUI interface, by default served on the `/admin/` mount path. (This client is a work in progress and closed source)

## Installation instructions

Comming soon...
