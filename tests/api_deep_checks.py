"""Additional SQL-backed checks. Uses existing fixtures in the isolated test DB.
Run after api_checks.py with TEST_SEED_PASSWORD still set. No rows are deleted.
"""
import concurrent.futures
import datetime as dt
import http.cookiejar
import json
import os
import pathlib
import random
import string
import urllib.error
import urllib.request

BASE=os.environ.get('TEST_API_URL','http://127.0.0.1:5091')+'/api'
TODAY=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
PASSWORD='ApiChecksOnly!2026'
checks=0
class Client:
    def __init__(self,login):
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.call('POST','/auth/login',{'login':login,'password':PASSWORD})
    def call(self,method,path,body=None,status=200):
        req=urllib.request.Request(BASE+path,method=method,data=None if body is None else json.dumps(body).encode(),headers={'Content-Type':'application/json'})
        try:
            with self.opener.open(req,timeout=25) as r:code=r.status;raw=r.read();ct=r.headers.get('Content-Type','')
        except urllib.error.HTTPError as r:code=r.code;raw=r.read();ct=r.headers.get('Content-Type','')
        if code!=status:raise AssertionError(f'{method} {path}: {code} expected {status}: {raw.decode(errors="replace")}')
        return json.loads(raw) if 'json' in ct else raw
    def upload(self,path,fields,filename):
        boundary='NnnTestBoundary';parts=[]
        for name,value in fields.items():parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'.encode()+pathlib.Path(filename).read_bytes()+b'\r\n')
        parts.append(f'--{boundary}--\r\n'.encode());req=urllib.request.Request(BASE+path,data=b''.join(parts),method='POST',headers={'Content-Type':'multipart/form-data; boundary='+boundary})
        with self.opener.open(req,timeout=25) as r:return json.load(r)
def check(value,label):
    global checks
    assert value,label
    checks+=1;print('PASS:',label,flush=True)
assistant=Client('TL01');manager=Client('QL01');teacher=Client('GV01');parent=Client('0900000001');other=Client('0900000002');supervisor=Client('GS01')
suffix=''.join(random.choices(string.ascii_uppercase,k=6));birth=TODAY.replace(year=TODAY.year-6).isoformat();tid=assistant.call('GET','/classes/teachers')[0]['id']
def student(label,class_id):
    s=assistant.call('POST','/students',{'name':label+' '+suffix,'birthDate':birth,'gender':'Nữ','parentName':'Phụ Huynh Kiểm Thử','phone':'0900000001','program':'Cơ bản','trialId':None})
    assistant.call('POST','/classes/'+class_id+'/enroll',{'studentId':s['id']});return s
def make_class(label,weekday,start,end):
    c=assistant.call('POST','/classes',{'name':label+suffix,'program':'Cơ bản','weekday':weekday,'start':start,'end':end,'capacity':7})
    assistant.call('POST','/classes/'+c['id']+'/teacher',{'teacherId':tid});assistant.call('POST','/classes/'+c['id']+'/sessions',{'from':(TODAY-dt.timedelta(days=7)).isoformat(),'to':(TODAY+dt.timedelta(days=35)).isoformat()});return c

if TODAY.weekday()!=4:
    c=make_class('Điểm danh ',(TODAY.weekday()+1)%7,'07:30:00','08:30:00');s=student('Bé Điểm Danh',c['id'])
    sessions=assistant.call('GET',f'/sessions?from={TODAY-dt.timedelta(days=7)}&to={TODAY+dt.timedelta(days=35)}');session=next(x for x in sessions if x['classId']==c['id'] and x['date']==TODAY.isoformat())
    month=TODAY.isoformat()[:7];assistant.call('POST','/tuition',{'studentId':s['id'],'month':month});initial=next(t for t in parent.call('GET','/tuition?month='+month) if t['id']==s['id'])['remaining']
    mark={'students':[{'studentId':s['id'],'present':True}],'trials':[],'finalize':False}
    teacher.call('POST','/sessions/'+session['id']+'/attendance',mark)
    check(not parent.call('GET','/students/'+s['id'])['attendance'],'Draft attendance is hidden from parent history')
    mark['finalize']=True;teacher.call('POST','/sessions/'+session['id']+'/attendance',mark);teacher.call('POST','/sessions/'+session['id']+'/attendance',mark,400)
    balance=next(t for t in parent.call('GET','/tuition?month='+month) if t['id']==s['id'])['remaining'];check(balance==initial-1,'Finalization deducts once and rejects repeated finalization')
    image=teacher.upload('/artworks',{'studentId':s['id'],'sessionId':session['id']},'artifacts/test-artwork.jpg')
    teacher.call('POST','/progress/review',{'studentId':s['id'],'sessionId':session['id'],'lines':'Nét vẽ tốt','colors':'Phối màu tốt','learning':'Tiếp thu tốt'})
    assistant.call('POST','/progress',{'studentId':s['id'],'sessionId':session['id'],'evaluationDate':TODAY.isoformat(),'status':'Chậm tiến độ','note':'Cần hỗ trợ thêm'})
    teacher.call('POST','/progress',{'studentId':s['id'],'sessionId':session['id'],'evaluationDate':TODAY.isoformat(),'status':'Đúng tiến độ','note':'Không được phép'},403)
    history=parent.call('GET','/progress/'+s['id']);check(len(history['artworks'])==1 and len(history['reviews'])==1 and len(history['progress'])==1,'Artwork, teacher review and assistant progress persist in one private journal')
    other.call('GET','/artworks/'+image['id'],status=403);check(parent.call('GET','/artworks/'+image['id']+'?thumbnail=true')[:2]==b'\xff\xd8','Artwork endpoint protects ownership and returns a real JPEG thumbnail')

    # Change a future timetable while preserving past session snapshots and used lessons.
    effective=TODAY+dt.timedelta(days=1);newday=(effective.weekday()+1)%7
    if newday==5:effective+=dt.timedelta(days=1);newday=(effective.weekday()+1)%7
    before=assistant.call('GET',f'/sessions?from={TODAY-dt.timedelta(days=7)}&to={TODAY+dt.timedelta(days=35)}');old=next(x for x in before if x['id']==session['id'])
    assistant.call('PUT','/classes/'+c['id'],{'name':c['name'],'program':'Cơ bản','weekday':newday,'start':'13:00:00','end':'14:00:00','capacity':7,'effectiveFrom':effective.isoformat()})
    after=assistant.call('GET',f'/sessions?from={TODAY-dt.timedelta(days=7)}&to={TODAY+dt.timedelta(days=35)}');preserved=next(x for x in after if x['id']==session['id'])
    check(preserved['start']==old['start'] and preserved['closed'],'Schedule revision preserves historical time and finalized attendance')
    fee=next(t for t in parent.call('GET','/tuition?month='+month) if t['id']==s['id']);check(fee['lessons']-fee['remaining']==1,'Schedule revision preserves the number of already used lessons')
    check(all(x['start']=='13:00:00' for x in after if x['classId']==c['id'] and x['date']>=effective.isoformat()),'New timetable applies only from selected effective date')

# Concurrent bookings must never reserve more than two make-up places.
classes=assistant.call('GET','/classes');a=next(c for c in classes if c['name'].startswith('Kiểm thử A '));b=next(c for c in classes if c['name'].startswith('Kiểm thử B '));sessions=assistant.call('GET',f'/sessions?from={TODAY}&to={TODAY+dt.timedelta(days=30)}');sa=next(x for x in sessions if x['classId']==a['id']);sb=next(x for x in sessions if x['classId']==b['id']);leaves=[]
for word in ['Một','Hai','Ba']:
    s=student('Bé Giữ Chỗ '+word,a['id']);assistant.call('POST','/tuition',{'studentId':s['id'],'month':sa['date'][:7]});leaves.append(parent.call('POST','/leaves',{'studentId':s['id'],'sessionId':sa['id'],'reason':None}))
def register(l):
    for attempt in range(5):
        try:parent.call('POST','/leaves/'+l['id']+'/register',{'sessionId':sb['id']});return True
        except AssertionError as e:
            if ': 409 expected' in str(e):continue
            if ': 400 expected' in str(e):return False
            raise
    return False
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:outcomes=list(executor.map(register,leaves))
held=[l for l in parent.call('GET','/leaves') if l['makeUpSessionId']==sb['id'] and l['status'] in ['Đã đăng ký học bù','Chờ duyệt','Đã xếp lịch bù']]
check(len(held)==2 and sum(outcomes)==2,'Three concurrent requests reserve exactly two make-up places')
print(f'{checks} deep integration checks passed.',flush=True)
