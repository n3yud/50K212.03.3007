"""Read-only local load sample against the isolated integration database."""
import concurrent.futures, datetime as dt, http.cookiejar, json, os, pathlib, time, urllib.request
base=os.environ.get('TEST_API_URL','http://127.0.0.1:5091')+'/api'
opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
req=urllib.request.Request(base+'/auth/login',data=json.dumps({'login':'TL01','password':'ApiChecksOnly!2026'}).encode(),headers={'Content-Type':'application/json'})
with opener.open(req) as r:assert r.status==200
today=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date().isoformat();paths=['/students','/sessions?from='+today+'&to='+today,'/tuition?month='+today[:7],'/reports/dashboard']
for p in paths:
    with opener.open(base+p) as r:r.read()
def read(i):
    start=time.perf_counter()
    with opener.open(base+paths[i%len(paths)],timeout=10) as r:r.read();status=r.status
    return {'status':status,'seconds':round(time.perf_counter()-start,4),'path':paths[i%len(paths)]}
with concurrent.futures.ThreadPoolExecutor(max_workers=50) as pool:rows=list(pool.map(read,range(50)))
durations=sorted(x['seconds'] for x in rows);report={'concurrentClients':50,'requests':50,'allSuccessful':all(r['status']==200 for r in rows),'maxSeconds':max(durations),'p95Seconds':durations[47],'allUnderTwoSeconds':max(durations)<=2,'scope':'Local, read-only sample on an isolated SQL Server test database; not a production SLA.'}
pathlib.Path('artifacts').mkdir(exist_ok=True);pathlib.Path('artifacts/load-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print(json.dumps(report,indent=2));assert report['allSuccessful']
