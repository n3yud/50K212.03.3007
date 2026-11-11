"""Repeatable booking race check using fixtures created by api_deep_checks.py."""
import concurrent.futures, datetime as dt, http.cookiejar, json, os, urllib.error, urllib.request
base=os.environ.get('TEST_API_URL','http://127.0.0.1:5091')+'/api'
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(method,path,body=None):
    req=urllib.request.Request(base+path,method=method,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    try:
        with opener.open(req,timeout=20) as r:return r.status,json.load(r)
    except urllib.error.HTTPError as r:return r.code,json.load(r)
assert call('POST','/auth/login',{'login':'0900000001','password':'ApiChecksOnly!2026'})[0]==200
leaves=call('GET','/leaves')[1]
held=[l for l in leaves if l['studentName'].startswith('Bé Giữ Chỗ') and l['status'] in ['Đã đăng ký học bù','Chờ duyệt','Đã xếp lịch bù']]
for l in held:assert call('POST','/leaves/'+l['id']+'/cancel',{})[0]==200
leaves=[l for l in call('GET','/leaves')[1] if l['studentName'].startswith('Bé Giữ Chỗ') and l['status']=='Chờ xếp lịch bù'][:3]
assert len(leaves)==3
options=call('GET','/leaves/'+leaves[0]['id']+'/available')[1]
target=next(x['id'] for x in options if x['name'].startswith('Kiểm thử B '))
def register(l):
    for _ in range(5):
        code,data=call('POST','/leaves/'+l['id']+'/register',{'sessionId':target})
        if code in [200,400]:return code
        assert code==409,(code,data)
    return 409
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(register,leaves))
rows=call('GET','/leaves')[1];reservations=[l for l in rows if l['makeUpSessionId']==target and l['status'] in ['Đã đăng ký học bù','Chờ duyệt','Đã xếp lịch bù']]
assert len(reservations)==2 and results.count(200)==2,(results,reservations)
print('PASS: Three concurrent booking requests reserve exactly two places; no 500 response.')
