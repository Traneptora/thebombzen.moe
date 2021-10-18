# python3 uwsgi
# for /dump/

import base64
import binascii
import hashlib
import json
import re
import zlib

import requests

from api_common import get_post_form

with open('webhook_url_dump') as f:
    webhooks = json.load(f)

def upload(form):
    upload = form['upload']
    if upload is None or upload.filename is None or upload.file is None:
        return ('400 Bad Request', 'Invalid Upload')
    webhook = webhooks.get(form.getvalue('dump-location', 'default'), webhooks['default'])
    r = requests.post(webhook, files={'file': (upload.filename, upload.file)})
    js = r.json()
    ret = {'success': r.ok, 'statusCode': r.status_code, 'response': js}
    try:
        ret['url'] = str(js['attachments'][0]['url'])
    except (LookupError, TypeError, ValueError) as ex:
        return ('503 Service Unavailable', 'Backend Down')
    return (str(r.status_code), ret, [('access-control-allow-origin', '*')])

re_strip = re.compile(r'[^0-9A-Za-z\-_=]')

def dump(form):
    dump_file = form['dump-file']
    if dump_file is None or dump_file.file is None:
        return ('400 Bad Request', 'Invalid Dump')
    location = form.getvalue('dump-location', 'default')
    if re_strip.search(location):
        return ('400 Bad Request', 'Invalid Dump Location')
    if len(location) == 0 or len(location) > 64:
        return ('400 Bad Request', 'Bad Location Size')
    return ('501 Not Implemented', None)

def post(env, relative_uri):
    form = get_post_form(env)
    action = form.getvalue('action', '')
    if action == 'upload' and 'upload' in form:
        return upload(form)
    if action == 'dump' and 'dump-file' in form:
        return dump(form)
    return ('400 Bad Request', 'Unsupported action')

def get(env, relative_uri):
    # server still python 3.8
    encoded_tail = relative_uri[len('/dump/'):]
    try:
        comp_uri = base64.b64decode(encoded_tail, altchars=b'-_', validate=True)
    except binascii.Error:
        return ('404 Not Found', 'Not base64url')
    try:
        payload = zlib.decompress(comp_uri)
        s0 = int.from_bytes(payload[0:8], byteorder='little')
        s1 = int.from_bytes(payload[8:16], byteorder='little')
        fname = payload[16:].decode()
        uri = f'https://cdn.discordapp.com/attachments/{s0}/{s1}/{fname}'
    except Exception:
        return ('404 Not Found', 'Bad Format')
    return ('302 Found', uri)
