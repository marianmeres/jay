#!/bin/sh

nodemon \ 
    -w "/absolute/path/to/cms/project/data1" \
    -w "/absolute/path/to/cms/project/data2" \
    -e "yaml" \
    build