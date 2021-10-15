# python3 uwsgi
# for /dump/

from api_common import get_post_form

def post(env):
    form = get_post_form(env)
    return ('200 OK', {'success': 'successful test'})
