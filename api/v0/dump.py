# python3 uwsgi
# for /dump/

import tempfile

import requests

from api_common import get_post_form

with open('webhook_url_dump') as f:
    webhook = f.read()

def post(env):
    form = get_post_form(env)
    if form.getvalue('action', '') == 'upload' and 'upload' in form:
        upload = form['upload']
        if upload is not None and upload.filename is not None and upload.file is not None:
            r = requets.post(webhook, files={'file': (upload.filename, upload.file)})
            return (r.status_code, {'success': r.ok, 'response': r.json()})
        else:
            return ('400 Bad Request', 'Invalid Upload')
    return ('400 Bad Request', 'Unsupported action')
