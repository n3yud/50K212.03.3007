"""Integration checks against an isolated, freshly migrated SQL Server test DB.

Set TEST_API_URL and TEST_SEED_PASSWORD. This script creates clearly named test
records and never deletes or resets any database. Do not run against live data.
"""
import concurrent.futures
import datetime as dt
import http.cookiejar
import json
import os
import urllib.error
import urllib.request

BASE = os.environ.get('TEST_API_URL', 'http://127.0.0.1:5091') + '/api'
SEED = os.environ['TEST_SEED_PASSWORD']
NEW = 'ApiChecksOnly!2026'
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
checks = 0

class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
    def call(self, method, path, body=None, expected=200):
        req = urllib.request.Request(BASE+path, data=None if body is None else json.dumps(body).encode(), method=method, headers={'Content-Type':'application/json'})
        try:
            with self.opener.open(req, timeout=20) as res:
                status=res.status; data=res.read(); content=res.headers.get('Content-Type','')
        except urllib.error.HTTPError as res:
            status=res.code; data=res.read(); content=res.headers.get('Content-Type','')
        if status != expected:
            raise AssertionError(f'{method} {path}: expected {expected}, got {status}: {data.decode(errors="replace")}')
        return json.loads(data) if 'json' in content else data
    def login(self, login):
        self.call('POST','/auth/login',{'login':login,'password':SEED})
        self.call('POST','/auth/password',{'currentPassword':SEED,'newPassword':NEW})
        return self

def check(condition, name):
    global checks
    assert condition, name
    checks += 1
    print('PASS:',name,flush=True)

anon=Client()
anon.call('GET','/students',expected=401)
check(True,'Anonymous cannot read students')
manager=Client().login('QL01'); assistant=Client().login('TL01');teacher=Client().login('GV01');supervisor=Client().login('GS01');parent=Client().login('0900000001')
check(True,'Five roles authenticate and change initial password')
parent.call('POST','/classes',{'name':'Forbidden','program':'Cơ bản','weekday':1,'start':'09:00:00','end':'10:00:00','capacity':7},403)
supervisor.call('GET','/students',expected=403)
teacher.call('GET','/tuition',expected=403)
check(True,'Role restrictions enforced at backend')

suffix=dt.datetime.now().strftime('%H%M%S')
birth=(TODAY.replace(year=TODAY.year-6)).isoformat()
registration={'phone':'0900000001','children':[{'name':'Bé Kiểm Thử','birthDate':birth,'desiredTime':'Buổi sáng'}]}
anon.call('POST','/trials',registration)
anon.call('POST','/trials',registration,400)
check(True,'Public trial registration persists and rejects duplicate active trial')
trial=next(t for t in parent.call('GET','/trials') if t['studentName']=='Bé Kiểm Thử')
assistant.call('POST',f'/trials/{trial["id"]}/accept',{})
student=assistant.call('POST','/students',{'name':'Bé Học Viên','birthDate':birth,'gender':'Nữ','parentName':'Phụ Huynh Kiểm Thử','phone':'0900000001','program':'Cơ bản','trialId':None})
check(student['status']=='Chờ xếp lớp','New student waits for enrollment')
teachers=assistant.call('GET','/classes/teachers'); tid=teachers[0]['id']

def create_class(label,day,start='09:00:00',end='10:00:00'):
    c=assistant.call('POST','/classes',{'name':label+suffix,'program':'Cơ bản','weekday':day,'start':start,'end':end,'capacity':7})
    assistant.call('POST',f'/classes/{c["id"]}/teacher',{'teacherId':tid})
    assistant.call('POST',f'/classes/{c["id"]}/sessions',{'from':(TODAY-dt.timedelta(days=7)).isoformat(),'to':(TODAY+dt.timedelta(days=30)).isoformat()})
    return c

future=TODAY+dt.timedelta(days=1)
while future.weekday()==4:future+=dt.timedelta(days=1)
weekday=(future.weekday()+1)%7
class_a=create_class('Kiểm thử A ',weekday)
class_b=create_class('Kiểm thử B ',weekday,'11:00:00','12:00:00')
assistant.call('POST',f'/classes/{class_a["id"]}/enroll',{'studentId':student['id']})
check(parent.call('GET',f'/students/{student["id"]}')['student']['status']=='Đang học','Enrollment changes status to studying')
sessions=assistant.call('GET',f'/sessions?from={TODAY}&to={TODAY+dt.timedelta(days=30)}')
sa=next(s for s in sessions if s['classId']==class_a['id']);sb=next(s for s in sessions if s['classId']==class_b['id'])
assistant.call('POST',f'/trials/{trial["id"]}/propose',{'sessionId':sa['id']})
parent.call('POST',f'/trials/{trial["id"]}/confirm',{})
assistant.call('POST',f'/trials/{trial["id"]}/approve',{'approve':True},403)
manager.call('POST',f'/trials/{trial["id"]}/approve',{'approve':False})
check(next(t for t in parent.call('GET','/trials') if t['id']==trial['id'])['status']=='Chờ xếp ca học thử','Rejected trial uses owner-confirmed rescheduling status')
assistant.call('POST',f'/trials/{trial["id"]}/propose',{'sessionId':sa['id']})
parent.call('POST',f'/trials/{trial["id"]}/confirm',{})
manager.call('POST',f'/trials/{trial["id"]}/approve',{'approve':True})
check(True,'Trial proposal, parent confirmation and manager approval persist')

month=sa['date'][:7]
assistant.call('POST','/tuition',{'studentId':student['id'],'month':month})
initial_balance=next(t for t in parent.call('GET','/tuition?month='+month) if t['id']==student['id'])['remaining']
assistant.call('POST','/tuition',{'studentId':student['id'],'month':month},400)
leave=parent.call('POST','/leaves',{'studentId':student['id'],'sessionId':sa['id'],'reason':None})
parent.call('POST','/leaves',{'studentId':student['id'],'sessionId':sa['id'],'reason':None},400)
check(leave['status']=='Chờ xếp lịch bù','Leave starts in correct state and is unique')
fee=next(t for t in parent.call('GET','/tuition?month='+month) if t['id']==student['id'])
check(fee['remaining']==initial_balance-1,'Leave deducts one lesson exactly once from actual scheduled monthly balance')
choices=parent.call('GET',f'/leaves/{leave["id"]}/available')
choice=next(s for s in choices if s['id']==sb['id'])
parent.call('POST',f'/leaves/{leave["id"]}/register',{'sessionId':choice['id']})
assistant.call('POST',f'/leaves/{leave["id"]}/submit',{})
manager.call('POST',f'/leaves/{leave["id"]}/approve',{'approve':True})
check(next(l for l in parent.call('GET','/leaves') if l['id']==leave['id'])['status']=='Đã xếp lịch bù','Make-up passes through submitted and approved states')
parent.call('POST',f'/leaves/{leave["id"]}/cancel',{})
final_leave=next(l for l in parent.call('GET','/leaves') if l['id']==leave['id'])
check(final_leave['status']=='Chờ xếp lịch bù' and final_leave['deadline']==leave['deadline'],'Cancellation frees seat and preserves original deadline')
fee=next(t for t in parent.call('GET','/tuition?month='+month) if t['id']==student['id'])
check(fee['remaining']==initial_balance-1,'Make-up registration and cancellation never deduct extra lessons')

# A second parent cannot access the first parent's child by guessing an ID.
anon.call('POST','/trials',{'phone':'0900000002','children':[{'name':'Bé Khác','birthDate':birth,'desiredTime':'Buổi chiều'}]})
reset=assistant.call('POST','/support/parent-password',{'phone':'0900000002','identityVerified':True})
other=Client();other.call('POST','/auth/login',{'login':'0900000002','password':reset['temporaryPassword']})
other.call('GET','/students',expected=403)
other.call('POST','/auth/password',{'currentPassword':reset['temporaryPassword'],'newPassword':NEW})
other.call('GET',f'/students/{student["id"]}',expected=403)
other.call('GET',f'/leaves/{leave["id"]}/available',expected=403)
check(True,'Parent IDOR and mandatory first-password-change checks pass')

assistant.call('POST',f'/students/{student["id"]}/archive',{})
check(parent.call('GET',f'/students/{student["id"]}')['student']['status']=='Đã bảo lưu','Archive preserves linked student record')
assistant.call('POST',f'/students/{student["id"]}/restore',{})
check(parent.call('GET',f'/students/{student["id"]}')['student']['status']=='Chờ xếp lớp','Restore returns to waiting for enrollment')
report=manager.call('GET',f'/reports?from={TODAY-dt.timedelta(days=7)}&to={TODAY}')
xlsx=manager.call('GET',f'/reports/export?from={TODAY-dt.timedelta(days=7)}&to={TODAY}')
check(xlsx[:2]==b'PK','Excel endpoint returns a real XLSX ZIP')
check(len(parent.call('GET','/notifications'))>0,'Parent notifications are persisted')
print(f'{checks} integration checks passed. Fixture records retained in the isolated test database.',flush=True)
