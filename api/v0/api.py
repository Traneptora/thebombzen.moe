# python3 uwsgi
# api.py
# api dispatch file

import json
import traceback

from pr_data import post as pr_data_post
from dump import post as dump_post
from dump import get as dump_get

endpoints = {
    '/azur-lane/pr-data/': {
        'post': pr_data_post,
    },
    '/dump/': {
        'post': dump_post,
        'get': dump_get,
    },
}

def is_post_request(environ):
    if environ['REQUEST_METHOD'].upper() != 'POST':
        return (False, False)
    if environ.get('CONTENT_TYPE', '').startswith('multipart/form-data'):
        return (True, True)
    return (True, False)

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
    status, result, headers, *_ = *dispatch(env), [], None
    headers += [('Content-Type', 'application/json')]
    if status.startswith('200'):
        return (status, headers, [json.dumps(result).encode()])
    if status.startswith('301') or status.startswith('302'):
        headers += [('location', result)]
        return (status, headers, [])
    result_dict = {'success': False, 'status': status}
    if result:
        result_dict['result'] = result
    result = [json.dumps(result_dict).encode()]
    return (status, headers, result)

def dispatch(env):
    if not env['REQUEST_URI'].startswith('/api/v0/'):
        return ('404 Not Found', None)
    # server still on 3.8
    request_uri = env['REQUEST_URI'][len('/api/v0'):]
    matched_endpoint = None
    for endpoint in endpoints:
        if request_uri.startswith(endpoint):
            matched_endpoint = endpoint
            break
    if matched_endpoint is None:
        return ('404 Not Found', None)
    method_table = endpoints[matched_endpoint]
    post, formdata = is_post_request(env)
    if post:
        if matched_endpoint != request_uri:
            return ('404 Not Found', 'Bad Endpoint')
        if not formdata:
            return ('400 Bad Request', 'Please use content-type: multipart/form-data')
        if 'post' in method_table:
            return method_table['post'](env, request_uri)
    elif env['REQUEST_METHOD'].lower() in method_table:
        return method_table[env['REQUEST_METHOD'].lower()](env, request_uri)
    return ('405 Method Not Allowed', None)
