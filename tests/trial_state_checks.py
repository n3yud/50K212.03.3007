"""Complete trial life-cycle using an explicitly isolated historical fixture.

The only direct SQL update targets the newly created test session in a database
whose name starts NgoiNhaNho_Test_. It simulates the trial having taken place.
"""
import datetime as dt, http.cookiejar, json, os, random, string, subprocess, urllib.error, urllib.request, uuid
base=os.environ.get('TEST_API_URL','http://127.0.0.1:5091')+'/api'
database=os.environ.get('TEST_DB_NAME','NgoiNhaNho_Test_20261111_b91a7d')
assert database.startswith('NgoiNhaNho_Test_') and database.replace('_','').isalnum()
class Client:
    def __init__(self,login):
        self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()));self.call('POST','/auth/login',{'login':login,'password':'ApiChecksOnly!2026'})
    def call(self,method,path,data=None):
        req=urllib.request.Request(base+path,method=method,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json'})
        with self.opener.open(req,timeout=20) as r:return json.load(r)
assistant=Client('TL01');manager=Client('QL01');teacher=Client('GV01');parent=Client('0900000001')
today=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date();future=today+dt.timedelta(days=1)
while future.weekday()==4:future+=dt.timedelta(days=1)
suffix=''.join(random.choices(string.ascii_uppercase,k=6));name='Bé Trải Nghiệm '+suffix;birth=today.replace(year=today.year-6).isoformat()
c=assistant.call('POST','/classes',{'name':'Kiểm thử học thử '+suffix,'program':'Cơ bản','weekday':(future.weekday()+1)%7,'start':'19:00:00','end':'20:00:00','capacity':7})
tid=assistant.call('GET','/classes/teachers')[0]['id'];assistant.call('POST','/classes/'+c['id']+'/teacher',{'teacherId':tid});assistant.call('POST','/classes/'+c['id']+'/sessions',{'from':future.isoformat(),'to':future.isoformat()})
s=next(x for x in assistant.call('GET',f'/sessions?from={future}&to={future}') if x['classId']==c['id'])
request=urllib.request.Request(base+'/trials',method='POST',data=json.dumps({'phone':'0900000001','children':[{'name':name,'birthDate':birth,'desiredTime':'Buổi tối'}]}).encode(),headers={'Content-Type':'application/json'})
with urllib.request.urlopen(request) as r:assert r.status==200
trial=next(x for x in parent.call('GET','/trials') if x['studentName']==name);path='/trials/'+trial['id']
assistant.call('POST',path+'/accept',{});assistant.call('POST',path+'/propose',{'sessionId':s['id']});parent.call('POST',path+'/confirm',{});manager.call('POST',path+'/approve',{'approve':True})
session_id=str(uuid.UUID(s['id']))
sql=f"UPDATE dbo.Sessions SET [Date]=CONVERT(date,'{today.isoformat()}'), [Start]='07:00:00', [End]='07:20:00' WHERE Id=CONVERT(uniqueidentifier,'{session_id}');"
sqlcmd=r'C:\Program Files\Microsoft SQL Server\Client SDK\ODBC\170\Tools\Binn\SQLCMD.EXE'
subprocess.run([sqlcmd,'-S','localhost','-E','-C','-b','-d',database,'-Q',sql],check=True,capture_output=True)
teacher.call('POST','/sessions/'+s['id']+'/attendance',{'students':[],'trials':[{'trialId':trial['id'],'present':True}],'finalize':True})
teacher.call('POST',path+'/evaluate',{'lines':'Nét vẽ rõ ràng','colors':'Màu sắc hài hòa','learning':'Tiếp thu tốt'})
assistant.call('POST',path+'/consult',{'roadmap':'Tiếp tục lộ trình Cơ bản','decision':'Đăng ký chính thức','internalNote':'Ghi chú nội bộ kiểm thử'})
result=next(x for x in parent.call('GET','/trials') if x['id']==trial['id'])
assert result['status']=='Đã tư vấn' and result['roadmap']=='Tiếp tục lộ trình Cơ bản' and result['internalNote'] is None
student=assistant.call('POST','/students',{'name':name,'birthDate':birth,'gender':'Nữ','parentName':'Phụ Huynh Kiểm Thử','phone':'0900000001','program':'Cơ bản','trialId':trial['id']})
assert student['status']=='Chờ xếp lớp' and student['trialId']==trial['id']
print('PASS: Trial registration -> proposal -> parent confirmation -> approval -> attendance -> assessment -> consultation -> linked official profile.')
print('PASS: Parent sees published assessment/roadmap and never sees the internal consultation note.')
