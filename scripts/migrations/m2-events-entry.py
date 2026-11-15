"""One-off M2 data entry, kept as a record. It read the Phase 1 page markup (commit 0eadbee) and cannot run after the M2 page rewrite; the YAML in src/content is now the source of truth."""
import re, html, yaml, os
R=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')+'/'
OUT=R+'src/content/destinations/sintra/events/'
def t(s):
    s=re.sub(r'<strong>(.*?)</strong>',r'**\1**',s); s=re.sub(r'<em>(.*?)</em>',r'*\1*',s)
    assert '<' not in s, s
    return html.unescape(s)
loc=open(R+'src/pages/sintra-local-discoveries.astro').read()
L=[(t(a),t(b),t(c.strip()),html.unescape(d),t(e)) for a,b,c,d,e in re.findall(r'<div class="event"><time>(.*?)</time><div><h3>(.*?)</h3><p>(.*?)<a href="([^"]*)">(.*?)</a></p></div></div>',loc)]
dis=open(R+'src/pages/sintra-discoveries.astro').read()
D=[(t(a),t(b)) for a,b in re.findall(r'<div class="event"><strong>(.*?)</strong><p>(.*?)</p></div>',dis)]
print(len(L),len(D))
EV=[
 ('cunha-e-costa-collection','A Coleção de Cunha e Costa: Um Portugal que nos Une','2026-06-01','2026-12-31',None,'Natural History Museum of Sintra','natural-history-museum',0,None),
 ('mordidas-do-tempo','Mordidas do Tempo','2026-08-01','2027-01-03',None,'Natural History Museum of Sintra','natural-history-museum',1,3),
 ('vinil-musa','VINIL','2026-10-15','2027-01-03',None,'MU.SA',None,2,None),
 ('mutatis-mutandis','Mutatis Mutandis','2026-10-24','2026-11-15',None,'Archaeological Museum of São Miguel de Odrinhas (MASMO)',None,3,None),
 ('taxi-concert','TAXI','2026-11-06',None,'21:00','Centro Cultural Olga Cadaval',None,4,1),
 ('colares-wine-journey','Wine journey between Sintra and Colares','2026-11-07',None,'10:00','Adega Regional de Colares','adega-regional-de-colares',5,2),
 ('masmo-mystery-afternoon','A mystery afternoon at the Archaeological Museum of São Miguel de Odrinhas','2026-10-31',None,None,'Archaeological Museum of São Miguel de Odrinhas (MASMO)',None,None,0),
]
os.makedirs(OUT,exist_ok=True)
for key,title,start,end,time,venue,place,li,di in EV:
    e={'id':f'event.sintra.{key}','destination':'destination.sintra','title':title,'starts_on':start}
    if end: e['ends_on']=end
    if time: e['time']=time
    e['venue']=venue
    if place: e['place']=f'place.sintra.{place}'
    e.update({'source':'src.tpg.website-2026','provenance':'legacy-website','observed_on':'2026-11-11','status':'reported','editorial':{}})
    if li is not None:
        w,h,p,href,lab=L[li]
        e['editorial']['local']={'when':w,'title':h,'text':p,'link':{'label':lab,'href':href,'external':False}}
    if di is not None:
        hd,p=D[di]; e['editorial']['directory']={'heading':hd,'text':p}
    yaml.safe_dump(e,open(OUT+key+'.yaml','w'),allow_unicode=True,sort_keys=False,width=1000)
L_ORDER=['cunha-e-costa-collection','mordidas-do-tempo','vinil-musa','mutatis-mutandis','taxi-concert','colares-wine-journey']
D_ORDER=['masmo-mystery-afternoon','taxi-concert','colares-wine-journey','mordidas-do-tempo']
LD=R+'src/content/destinations/sintra/lists/'
yaml.safe_dump({'id':'list.sintra.events-local','destination':'destination.sintra','title':'Local discoveries · seasonal diary','context':'event:local','items':[f'event.sintra.{k}' for k in L_ORDER]},open(LD+'events-local.yaml','w'),allow_unicode=True,sort_keys=False)
yaml.safe_dump({'id':'list.sintra.events-directory','destination':'destination.sintra','title':'Discoveries · seasonal diary','context':'event:directory','items':[f'event.sintra.{k}' for k in D_ORDER]},open(LD+'events-directory.yaml','w'),allow_unicode=True,sort_keys=False)
for x in L: print(x[0],'|',x[1])
for x in D: print(x)
