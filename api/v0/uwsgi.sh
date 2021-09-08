#!/bin/sh

if ! [ "$(id -u)" = 1000 ] ; then
    # not local user
    exec sudo -u "$(id -u -n 1000)" "$@"
fi

exec uwsgi --plugin python --socket 127.0.0.1:3031 --chdir "$(dirname "$0")" --wsgi-file pr-data.py --uid 1000 --gid 1000 --processes 16 --threads 1 --stats 127.0.0.1:9191
