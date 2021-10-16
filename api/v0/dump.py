# python3 uwsgi
# for /dump/

import base64
import binascii
import brotli
import tempfile

import requests

from api_common import get_post_form

with open('webhook_url_dump') as f:
    webhook = f.read()

def post(env, relative_uri):
    form = get_post_form(env)
    if form.getvalue('action', '') == 'upload' and 'upload' in form:
        upload = form['upload']
        if upload is not None and upload.filename is not None and upload.file is not None:
            r = requests.post(webhook, files={'file': (upload.filename, upload.file)})
            js = r.json()
            ret = {'success': r.ok, 'response': js}
            if ('attachments' in js and
                    type(js['attachments']) is list and
                    len(js['attachments']) > 0 and
                    'url' in js['attachments'][0]):
                url = js['attachments'][0]['url']
            else:
                return ('503 Service Unavailable', 'Backend Down')
            ret['url'] = 'https://thebombzen.moe/api/v0/dump/' + base64.b64encode(brotli.compress(url.encode()), altchars=b'-_')
            return (str(r.status_code), ret, [('access-control-allow-origin', '*')])
        else:
            return ('400 Bad Request', 'Invalid Upload')
    return ('400 Bad Request', 'Unsupported action')

def get(env, relative_uri):
    # server still python 3.8
    encoded_tail = relative_uri[len('/dump/'):]
    try:
        comp_uri = base64.b64decode(encoded_tail, altchars=b'-_', validate=True)
    except binascii.Error:
        return ('404 Not Found', 'Not base64url')
    try:
        uri = brotli.decompress(comp_uri).decode()
    except Exception:
        return ('404 Not Found', 'Not brotli')
    if not uri.startswith('https://'):
        return ('404 Not Found', 'Not HTTPS')
    return ('302 Found', uri)
