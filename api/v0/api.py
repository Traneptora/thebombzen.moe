# python3 uwsgi
# api.py
# api dispatch file

import json
import traceback

from pr_data import post as pr_data_post

endpoints = {
    '/azur-lane/pr-data/': {
        'post': pr_data_post,
    },
    '/dump/': {
        'post': dump_post,
    },
}

def is_post_request(environ):
    if environ['REQUEST_METHOD'].upper() != 'POST':
        return False
    return environ.get('CONTENT_TYPE', '').startswith('multipart/form-data')

def application(env, start_response):
    try:
        status, headers, lines = response_checker(env)
        start_response(status, headers)
        return lines
    except Exception as ex:
        traceback.print_exc()
        status = '500 Internal Server Error'
        start_response(status, [('Content-Type', 'application/json')])
        return [json.dumps({'success': False, 'status': status}).encode()]

def response_checker(env):
    status, result = dispatch(env)
    headers = [('Content-Type', 'application/json')]
    if status.startswith('200'):
        return (status, headers, [json.dumps(result).encode()])
    if status.startswith('301') or status.startswith('302'):
        headers += [('location', result)]
        return (status, headers, [])
    result = [json.dumps({'success': False, 'status': status}).encode()]
    return (status, headers, result)

def dispatch(env):
    if not env['REQUEST_URI'].startswith('/api/v0/'):
        return ('404 Not Found', None)
    # server still on 3.8
    request_uri = env['REQUEST_URI'][len('/api/v0'):]
    if request_uri not in endpoints:
        return ('404 Not Found', None)
    method_table = endpoints[request_uri]
    if is_post_request(env):
        if 'post' in method_table:
            return method_table['post'](env)
    elif env['REQUEST_METHOD'].upper() == 'GET':
        if 'get' in method_table:
            return method_table['get'](env)
    return ('405 Method Not Allowed', None)
