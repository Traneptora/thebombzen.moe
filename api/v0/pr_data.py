# python3 uwsgi
# for pr-data

import os
import re
import subprocess
import sys
import tempfile
from api_common import get_post_form

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
