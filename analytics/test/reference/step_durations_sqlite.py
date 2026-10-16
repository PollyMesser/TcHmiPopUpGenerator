# Unabhaengige Referenz fuer computeStepDurations(): CSV in Python parsen, SQL aus
# MachineDataStack backend/src/services/step-durations.ts in SQLite nachbilden.
# Aufruf: python3 step_durations_sqlite.py <csv> > step_durations.json
# Unabhängige Referenz: CSV in Python parsen, SQL aus step-durations.ts in SQLite nachbilden.
import csv, sqlite3, re, json, statistics, datetime
CAT = {0:"Kein Schritt (0)",1:"Filterpresse Schließen",2:"Prüfung Startkriterien",3:"Dichtheitsprüfung",4:"Prüfung Startkriterien 2",5:"Beschickung Befüllen",6:"Beschicken Druckstufe 1",7:"Beschicken Druckstufe 2",8:"Beschicken Druckstufe 3",9:"Beschicken Druckstufe 4",10:"Manuelle Pause",11:"Pause B1 leer",12:"Pause Freigabe fehlt",13:"Pause Klarwasser",14:"Pause Filtratbehälter MAX",15:"Pause Watchdog",16:"Pause Wechsel Reststoffbehälter",17:"Spaltwäsche 1",18:"Spaltwäsche 2",19:"Nachpressen Membran",20:"Kuchenpflege",21:"Prüfen Öffnen OK",22:"Filterpresse Öffnen",23:"Kuchenauswurf",24:"Zyklus beendet",90:"Handmodus",99:"Kein Schritt aktiv"}
GROUP = {1:"Schließen",2:"Schließen",3:"Schließen",4:"Schließen",5:"Beschicken",6:"Beschicken",7:"Beschicken",8:"Beschicken",9:"Beschicken",17:"Spaltwäsche",18:"Spaltwäsche",19:"Nachpressen Membran",20:"Kuchenpflege",21:"Öffnen",22:"Öffnen",23:"Kuchenauswurf"}
for p in range(10,17): GROUP[p]="Pause"
def norm(s): s=s.lower().replace("ä","ae").replace("ö","oe").replace("ü","ue").replace("ß","ss"); return re.sub(r"[^a-z0-9]","",s)
BYTEXT = {norm(v):k for k,v in CAT.items()}
PROCESS = [n for n in GROUP]; PAUSE=list(range(10,17))
db = sqlite3.connect(":memory:")
db.execute("create table m(id integer primary key, machine text, cycle_no int, ts int, step int)")
with open(__import__("sys").argv[1], encoding="latin1") as f:
    rd = csv.reader(f, delimiter=";"); next(rd)
    for row in rd:
        if not row: continue
        d = datetime.datetime.strptime(row[2]+" "+row[3], "%d.%m.%Y %H:%M:%S").replace(tzinfo=datetime.timezone.utc)
        db.execute("insert into m(machine,cycle_no,ts,step) values(?,?,?,?)", (row[0], int(row[1]), int(d.timestamp()), BYTEXT[norm(row[14])]))
# nominal (PERCENTILE_CONT 0.5 der dt > 0) – SQLite kennt es nicht -> Python
dts = [r[0] for r in db.execute("select dt from (select lead(ts) over (partition by machine order by ts, id) - ts as dt from m) where dt > 0")]
dts.sort(); nom = statistics.median(dts)
pl = "(" + ",".join(map(str,PAUSE)) + ")"; prl = "(" + ",".join(map(str,PROCESS)) + ")"
sql = f"""
with s0 as (select id, machine, cycle_no, step, ts,
   lead(ts) over (partition by machine order by ts, id) - ts as dt,
   lag(step) over (partition by machine, cycle_no order by ts, id) as prev_step from m),
s1 as (select machine, cycle_no, step, ts, case when dt is null or dt > 3*{nom} then {nom} else dt end as dur,
   sum(case when step in {pl} and (prev_step is null or prev_step not in {pl}) then 1 else 0 end)
     over (partition by machine, cycle_no order by ts, id) as pause_run from s0)
select machine, cycle_no, step, sum(dur), 0 from s1 where step in {prl} and step not in {pl} group by machine, cycle_no, step
union all
select machine, cycle_no, min(step), sum(dur), 1 from s1 where step in {pl} group by machine, cycle_no, pause_run
"""
cyc = {}
for mach, cno, step, dur, isp in db.execute(sql):
    c = cyc.setdefault((mach,cno), {"g":{}, "pauseS":0, "pc":0})
    if isp: c["pauseS"] += dur; c["pc"] += 1
    else: c["g"][GROUP[step]] = c["g"].get(GROUP[step],0) + dur
ACTIVE = {"Beschicken","Nachpressen Membran","Kuchenpflege"}
def st(v):
    return {"n":len(v),"sum":sum(v),"mean":sum(v)/len(v) if v else None,"median":statistics.median(v) if v else None}
groups = {}
for c in cyc.values():
    for g,d in c["g"].items(): groups.setdefault(g,[]).append(d)
act=[];sec=[];tot=[]
for c in cyc.values():
    if not any(g in ACTIVE for g in c["g"]): continue
    a=sum(d for g,d in c["g"].items() if g in ACTIVE); s=sum(d for g,d in c["g"].items() if g not in ACTIVE)
    act.append(a); sec.append(s); tot.append(a+s)
out = {"nominal":nom, "cycles":len(cyc), "groups":{g:st(v) for g,v in groups.items()},
       "pause": st([c["pauseS"] for c in cyc.values() if c["pc"]]), "pauseRuns": sum(c["pc"] for c in cyc.values()),
       "cat":{"active":st(act),"secondary":st(sec),"total":st(tot)}}
print(json.dumps(out, ensure_ascii=False))
