# Unabhaengige Referenz fuer computeReport()/computeCorrelation() (Tagesmittel, SD, Gruppen, Pearson-r).
# Aufruf: python3 report_sqlite.py <csv> > report.json
import csv, sqlite3, datetime, statistics, json, math, re, sys
def num(s):
    s=s.strip()
    if s=="": return None
    try: return float(s.replace(".","").replace(",","."))
    except: return None
db=sqlite3.connect(":memory:")
db.execute("create table m(id integer primary key, day text, step text, steptxt text, leistung real, druck real, pumpe real)")
with open(sys.argv[1],encoding="latin1",newline="") as f:
    rd=csv.reader(f,delimiter=";"); next(rd)
    for row in rd:
        if not row: continue
        d=datetime.datetime.strptime(row[2],"%d.%m.%Y").strftime("%Y-%m-%d")
        db.execute("insert into m(day,steptxt,leistung,druck,pumpe) values(?,?,?,?,?)",(d,row[14],num(row[11]),num(row[4]),num(row[7])))
daily=[(r[0],r[1]) for r in db.execute("select day, avg(leistung) from m group by day order by day")]
sd=[]
for day,_ in daily:
    v=[r[0] for r in db.execute("select leistung from m where day=? and leistung is not null",(day,))]
    sd.append(statistics.stdev(v) if len(v)>1 else None)
pump=[r[0] for r in db.execute("select avg(pumpe*(case when steptxt like 'Beschick%' then 1 else 0 end)) from m group by day order by day")]
grp={r[0]:[r[1],r[2]] for r in db.execute("select steptxt, count(*), max(druck) from m group by steptxt")}
pts=[(r[0],r[1]) for r in db.execute("select druck, leistung from m where druck is not null and leistung is not null order by id")]
xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
mx=sum(xs)/len(xs); my=sum(ys)/len(ys)
r=sum((a-mx)*(b-my) for a,b in pts)/math.sqrt(sum((a-mx)**2 for a in xs)*sum((b-my)**2 for b in ys))
print(json.dumps({"n":db.execute("select count(*) from m").fetchone()[0],"days":[d for d,_ in daily],"avg":[a for _,a in daily],"sd":sd,"pump":pump,"groups":grp,"r":r,"np":len(pts)}))
