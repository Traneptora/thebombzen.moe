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
            r = requests.post(webhook, files={'file': (upload.filename, upload.file)})
            js = r.json()
            ret = {'success': r.ok, 'response': js}
            if ('attachments' in js and
                    type(js['attachments']) is list and
                    len(js['attachments']) > 0 and
                    'url' in js['attachments'][0]):
                ret['url'] = js['attachments'][0]['url']
            return (str(r.status_code), ret, [('access-control-allow-origin', '*')])
        else:
            return ('400 Bad Request', 'Invalid Upload')
    return ('400 Bad Request', 'Unsupported action')
