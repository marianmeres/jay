#!/bin/sh

nodemon \ 
    -w "/absolute/path/to/project1/data" \
    -w "/absolute/path/to/project2/data" \
    -e "yaml" \
    build