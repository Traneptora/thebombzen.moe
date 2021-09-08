# python3 uwsgi

import cgi
import json
import os
import re
import subprocess
import sys
import tempfile
import traceback

asset_cache = {}
static_asset_dir = 'pr-data/static/'

def eprint(*args, **kwargs):
    kwargs['file'] = sys.stderr
    print(*args, **kwargs)

# will later wrap python.logging
def logprint(*args, **kwargs):
    eprint(*args, **kwargs)

def canonicalize_asset(asset):
    return asset if asset.startswith(static_asset_dir) else static_asset_dir + asset

def canonicalassets(f):
    def inner(asset):
        return f(canonicalize_asset(asset))
    return inner

@canonicalassets
def load_asset(asset):
    logprint(f'Loading asset: {asset}')
    mtime = os.path.getmtime(asset)
    with open(asset, 'rb') as fd:
        asset_cache[asset] = {
            'mtime': mtime,
            'data' : fd.read(),
        }
    return asset_cache[asset]['data']

@canonicalassets
def get_asset(asset):
    if asset not in asset_cache:
        return load_asset(asset)
    mtime = os.path.getmtime(asset)
    if asset_cache[asset]['mtime'] != mtime:
        logprint(f'Asset changed on disk: {asset}')
        return load_asset(asset)
    return asset_cache[asset]['data']

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
    status, result = main(env)
    headers = [('Content-Type', 'application/json')]
    if status == '200 OK':
        return (status, headers, [json.dumps(result).encode()])
    if status == '302 Found' or status == '301 Moved Permanently':
        headers += [('location', result)]
        return (status, headers, [])
    result = [json.dumps({'success': False, 'status': status}).encode()]
    return (status, headers, result)

def main(env):
    if not env['REQUEST_URI'].startswith('/api/v0/'):
        return ('404 Not Found', None)
    # server still on 3.8
    request_uri = env['REQUEST_URI'][len('/api/v0'):]
    if request_uri != '/azur-lane/pr-data/':
        return ('404 Not Found', None)
    if is_post_request(env):
        return post(env)
    elif env['REQUEST_METHOD'].upper() == 'GET':
        return get(env)
    else:
        return ('405 Method Not Allowed', None)

def get(env):
    return ('405 Method Not Allowed', None)

def post(env):
    form = get_post_form(env)
    project_series = form.getvalue('project-series', '')
    project_type = form.getvalue('project-type', '')
    project_name = form.getvalue('project-name', '')
    results_screenshot = form['results-screenshot']
    if project_series == '' or project_name == '' or results_screenshot is None or results_screenshot.filename is None or results_screenshot.filename == '':
        return ('400 Bad Request', None)
    fd, tmp_name = tempfile.mkstemp(prefix='pr-data-', dir='/tmp/')
    tmp = os.fdopen(fd, mode='w+b')
    tmp.write(results_screenshot.file.read())
    status = subprocess.run(['./image-uploaded.sh', tmp_name, results_screenshot.filename, project_series.upper(), project_type.upper(), project_name.upper()], capture_output=True).stdout.decode()
    status_dict = {}
    for line in status.splitlines():
        match = re.match(r'(\w+):\s(.*)', line)
        if not match:
            logprint(line)
        k, v = match.group(1, 2)
        status_dict[k] = v
    status_dict.update({'success': True})
    return ('200 OK', status_dict)

def is_post_request(environ):
    if environ['REQUEST_METHOD'].upper() != 'POST':
        return False
    return environ.get('CONTENT_TYPE', '').startswith('multipart/form-data')

def get_post_form(environ):
    input = environ['wsgi.input']
    post_form = environ.get('wsgi.post_form')
    if (post_form is not None
        and post_form[0] is input):
        return post_form[2]
    # This must be done to avoid a bug in cgi.FieldStorage
    environ.setdefault('QUERY_STRING', '')
    fs = cgi.FieldStorage(fp=environ['wsgi.input'],
                          environ=environ,
                          keep_blank_values=1)
    new_input = InputProcessed()
    post_form = (new_input, input, fs)
    environ['wsgi.post_form'] = post_form
    environ['wsgi.input'] = new_input
    return fs

class InputProcessed(object):
    def read(self, *args):
        raise EOFError('The wsgi.input stream has already been consumed')
    readline = readlines = __iter__ = read
