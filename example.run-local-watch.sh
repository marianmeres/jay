#!/bin/sh

# example to run locally with auto restart on schema definition change
nodemon \ 
    -w "/absolute/path/to/project1/data" \
    -w "/absolute/path/to/project2/data" \
    -e "yaml" \
    build