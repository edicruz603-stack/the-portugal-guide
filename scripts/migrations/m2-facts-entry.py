"""One-off M2 data entry, kept as a record of how the YAML was produced. The YAML is now the source of truth; do not re-run over edited content."""
import yaml, re, os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src/content/destinations/sintra/facts/')
T='2026-11-11'; S='2026-11-07'
def dms(s):
    m=re.findall(r"(\d+)[°º]\s*(\d+)[’']\s*([\d.,]+)[”\"″]?\s*([NSEW])",s)
    out=[]
    for d,mi,se,h in m:
        v=int(d)+int(mi)/60+float(se.replace(',','.'))/3600
        out.append(-v if h in 'SW' else v)
    return out
FACTS={}
def F(place,key,kind,text,value,source,prov,status,observed,checked=None,subject=None,quote=None,group=None,note=None,review=None):
    f={'id':f'fact.sintra.{place}.{key}','kind':kind}
    if subject: f['subject']=subject
    f['value']=value; f['text']=text
    if quote: f['quote']=quote
    f['source']=source; f['provenance']=prov; f['observed_on']=observed
    if checked: f['checked_on']=checked
    f['status']=status
    if group: f['conflict_group']=group
    if review: f['review_after_days']=review
    if note: f['note']=note
    FACTS.setdefault(place,[]).append(f)
def OFF(place,key,kind,text,value,source,subject=None,quote=None,date=T,**kw):
    F(place,key,kind,text,value,source,'official-page-read','checked',date,date,subject,quote,**kw)
def PDF(place,key,kind,text,value,source,status='checked',subject=None,quote=None,**kw):
    F(place,key,kind,text,value,source,'pdf-first-edition-2026',status,S,S if status=='checked' else None,subject,quote,**kw)
def WEB(place,key,kind,text,value,quote,status='reported',subject=None,**kw):
    F(place,key,kind,text,value,'src.tpg.website-2026','legacy-website',status,T,None,subject,quote,**kw)
def COORD(dmstext,keep=None):
    lat,lon=dms(dmstext)
    v={'lat':keep[0] if keep else round(lat,6),'lon':keep[1] if keep else round(lon,6),'dms':dmstext}
    if keep: v['precision']='rounded to the existing map marker (4–5 decimals)'
    return v
PS='src.parques-de-sintra.'
H=60  # review window for hours and prices

# ---------------- National Palace + gardens
F('national-palace','coordinates','coordinates','38°47’50.50”N 9°23’25.87”W (monument page)',COORD("38°47'50.50\"N 9°23'25.87\"W",(38.79736,-9.39052)),PS+'national-palace','official-page-read','unresolved',T,None,'monument page',group='national-palace-coordinates',note='The ticket-office page gives 38°47′50.7″N 9°23′25.9″W (about 6 m away). Both kept; the map keeps the existing marker.')
F('national-palace','coordinates-ticket-office','coordinates','38°47’50.7”N 9°23’25.9”W (ticket-office page)',COORD("38°47'50.7\"N 9°23'25.9\"W"),PS+'ticket-office.national-palace','official-page-read','unresolved',T,None,'ticket-office page',group='national-palace-coordinates')
OFF('national-palace','hours-palace','hours','Palace 09:30–18:30',{'opens':'09:30','closes':'18:30'},PS+'national-palace-essential-visit',subject='palace',review=H)
OFF('national-palace','last-entry-palace','last-entry','Palace: last ticket and last admission 17:30',{'time':'17:30'},PS+'national-palace-essential-visit',subject='palace',review=H)
OFF('national-palace','ticket-office-closed-midday','hours','Ticket office closed 12:00–13:00; automatic ticket machine available',{'closed_from':'12:00','closed_to':'13:00'},PS+'ticket-office.national-palace',review=H)
for k,v,txt in [('price-essential',{'adult':13,'youth':10,'senior':10,'family':35,'currency':'EUR'},'Essential visit: adult €13, youth €10, senior €10, family €35'),
                ('price-full',{'adult':35,'youth':20,'senior':25,'family':95,'currency':'EUR'},'Full visit: adult €35, youth €20, senior €25, family €95'),
                ('price-theatrical',{'adult':65,'youth':20,'senior':50,'family':130,'currency':'EUR'},'Theatrical visit: adult €65, youth €20, senior €50, family €130')]:
    OFF('national-palace',k,'price',txt,v,PS+'national-palace',review=H)
OFF('national-palace','walk-from-station','transport','Sintra train station to the National Palace: 10–15 minutes',{'minutes_min':10,'minutes_max':15},PS+'national-palace')
OFF('national-palace','private-traffic','rule','Private vehicles in the historic centre are limited to residents',{'restricted':True},PS+'national-palace')
OFF('national-palace-gardens','price','price','Gardens: free entrance',{'adult':0,'currency':'EUR'},PS+'national-palace',review=H)
OFF('national-palace-gardens','hours','hours','Gardens 09:30–18:30',{'opens':'09:30','closes':'18:30'},PS+'national-palace-essential-visit',subject='gardens',review=H)
F('national-palace-gardens','last-entry-ticket-office','last-entry','Gardens: last entry 18:00 (ticket-office page)',{'time':'18:00'},PS+'ticket-office.national-palace','official-page-read','unresolved',T,None,'gardens',group='national-palace-gardens-last-entry')
F('national-palace-gardens','last-entry-opening-times','last-entry','Gardens: last admission 18:00 (opening-times page)',{'time':'18:00'},PS+'opening-times','official-page-read','unresolved',T,None,'gardens',group='national-palace-gardens-last-entry')
F('national-palace-gardens','last-entry-essential-visit','last-entry','Gardens: last ticket and last admission 17:30 (Essential Visit page)',{'time':'17:30'},PS+'national-palace-essential-visit','official-page-read','unresolved',T,None,'gardens',group='national-palace-gardens-last-entry')
F('national-palace-gardens','last-entry-website','last-entry','Gardens: last entry 18:00 (previous website edition)',{'time':'18:00'},'src.tpg.website-2026','legacy-website','unresolved',T,None,'gardens',quote='09:30–18:30; last entry 18:00',group='national-palace-gardens-last-entry')

# ---------------- Pena
OFF('pena-palace','coordinates-main-entrance','coordinates','Main entrance 38°47’16.45”N 9°23’15.35”W',COORD("38°47'16.45\"N 9°23'15.35\"W",(38.7879,-9.3876)),PS+'visitor-map',subject='main entrance to the park')
PDF('pena-palace','coordinates-lakes-entrance','coordinates','Lakes entrance 38°47’21.4”N 9°23’31.9”W',COORD("38°47'21.4\"N 9°23'31.9\"W"),PS+'pena',subject='Lakes entrance')
OFF('pena-palace','hours-park','hours','Park 09:00–19:00; last ticket and last admission 18:00',{'opens':'09:00','closes':'19:00','last_entry':'18:00'},PS+'opening-times',subject='park',review=H)
OFF('pena-palace','hours-palace','hours','Palace 09:30–18:30',{'opens':'09:30','closes':'18:30'},PS+'opening-times',subject='palace',review=H)
PDF('pena-palace','last-entry-palace','last-entry','Palace: last ticket 17:30, last entry 18:00',{'last_ticket':'17:30','last_entry':'18:00'},PS+'pena',subject='palace',review=H)
OFF('pena-palace','timed-ticket','rule','Palace tickets only for a specific date and time',{'timed':True},PS+'parks-list',quote='Palace entry requires a dated time slot')
OFF('pena-palace','walk-gate-to-palace','route','About 30 minutes between the park entrance gate and the palace meeting point',{'minutes':30},PS+'pena-skip-the-line')
PDF('pena-palace','step-free-route','access','Step-free route of 600 m; palace interior not accessible',{'step_free_route_m':600,'interior_accessible':False},PS+'pena')
for k,v,txt in [('price-essential',{'adult':20,'youth':18,'senior':18,'family':65,'currency':'EUR'},'Essential visit: adult €20, youth €18, senior €18, family €65'),
                ('price-complete',{'adult':45,'youth':20,'senior':35,'family':115,'currency':'EUR'},'Complete visit: adult €45, youth €20, senior €35, family €115'),
                ('price-park',{'adult':12,'youth':10,'senior':10,'family':40,'currency':'EUR'},'Park only: adult €12, youth €10, senior €10, family €40')]:
    PDF('pena-palace',k,'price',txt,v,PS+'ticket-office',review=H)
PDF('pena-palace','shuttle-supplement','price','Park–palace shuttle: €4.50 return supplement',{'amount':4.5,'currency':'EUR'},PS+'ticket-office',review=H)

# ---------------- Moorish Castle + São Pedro de Canaferrim
OFF('moorish-castle','coordinates-monument','coordinates','Monument 38°47’24.25”N 9°23’21.47”W',COORD("38°47'24.25\"N 9°23'21.47\"W",(38.79007,-9.3893)),PS+'moorish-castle',subject='monument')
OFF('moorish-castle','coordinates-entrance','coordinates','Entrance 38°47’33.2”N 9°23’17.5”W',COORD("38°47'33.2\"N 9°23'17.5\"W"),PS+'ticket-office.moorish-castle',subject='entrance',note='A different point from the monument coordinates, not a conflict.')
OFF('moorish-castle','hours','hours','09:30–18:00; last ticket and last entry 17:30',{'opens':'09:30','closes':'18:00','last_entry':'17:30'},PS+'ticket-office.moorish-castle',review=H)
PDF('moorish-castle','price','price','Adult €12, youth €10, senior €10, family €33',{'adult':12,'youth':10,'senior':10,'family':33,'currency':'EUR'},PS+'ticket-office',review=H)
OFF('moorish-castle','private-traffic','rule','Private traffic is not permitted on the access roads',{'private_vehicles':False},PS+'ticket-office.moorish-castle')
OFF('moorish-castle','founded','history','Founded in the 10th century',{'century':10},PS+'moorish-castle')
PDF('sao-pedro-de-canaferrim','works','notice','Refurbishment of the church began 12 December 2024 and is still listed on the operator’s works page',{'started':'2024-12-12'},PS+'site',review=H)

# ---------------- Monserrate
F('monserrate','coordinates-a','coordinates','38°47’30.70”N 9°25’9.09”W (visitor map; monument page gives 38°47’30”N 9°25’09”W)',COORD("38°47'30.70\"N 9°25'9.09\"W"),PS+'visitor-map','official-page-read','unresolved',T,None,group='monserrate-coordinates')
F('monserrate','coordinates-b','coordinates','38°47’38.515”N 9°25’15.413”W (second, unlabelled value on the English monument page)',COORD("38°47'38.515\"N 9°25'15.413\"W"),PS+'monserrate','official-page-read','unresolved',T,None,group='monserrate-coordinates',note='About 280 m from coordinates-a; the page does not say which point each value marks.')
OFF('monserrate','coordinates-entrance','coordinates','Park entrance 38°47’27.39”N 9°24’40.24”W',COORD("38°47'27.39\"N 9°24'40.24\"W"),PS+'ticket-office.monserrate',subject='park entrance')
OFF('monserrate','hours-park','hours','Park 09:00–19:00; last admission 18:00',{'opens':'09:00','closes':'19:00','last_entry':'18:00'},PS+'monserrate-pt',subject='park',review=H)
F('monserrate','last-ticket-park-monument-page','last-entry','Park: last ticket 17:30 (monument page)',{'time':'17:30'},PS+'monserrate-pt','official-page-read','unresolved',T,None,'park, last ticket',group='monserrate-park-last-ticket')
F('monserrate','last-ticket-park-ticket-office','last-entry','Park: last ticket and last entry 18:00 (ticket-office page)',{'time':'18:00'},PS+'ticket-office.monserrate','official-page-read','unresolved',T,None,'park, last ticket',group='monserrate-park-last-ticket')
OFF('monserrate','hours-palace','hours','Palace 09:30–18:00; last ticket 17:00, last admission 17:30',{'opens':'09:30','closes':'18:00','last_ticket':'17:00','last_entry':'17:30'},PS+'monserrate-pt',subject='palace',review=H)
OFF('monserrate','price','price','Adult €12, youth €10, senior €10, family €33',{'adult':12,'youth':10,'senior':10,'family':33,'currency':'EUR'},PS+'monserrate-pt',quote='Adult ticket currently €12',review=H)
OFF('monserrate','roof-works','notice','Palace roof recovery under way until the first quarter of 2027, with scaffolding and a temporary cover',{'until':'2027-Q1'},PS+'ticket-office.monserrate',review=H)

# ---------------- Regaleira
PDF('quinta-da-regaleira','coordinates','coordinates','38°47’45.15”N 9°23’50.21”W',COORD("38°47'45.15\"N 9°23'50.21\"W"),'src.regaleira.site')
PDF('quinta-da-regaleira','hours-winter','hours','January–March and October–December 10:00–18:30',{'opens':'10:00','closes':'18:30'},'src.regaleira.site',subject='Jan–Mar, Oct–Dec',review=H)
PDF('quinta-da-regaleira','hours-summer','hours','April–September 09:00–19:30',{'opens':'09:00','closes':'19:30'},'src.regaleira.site',subject='Apr–Sep',review=H)
PDF('quinta-da-regaleira','last-entry','last-entry','Last entrance 17:30',{'time':'17:30'},'src.regaleira.site',review=H)
PDF('quinta-da-regaleira','price-adult','price','Adult €20',{'adult':20,'currency':'EUR'},'src.regaleira.ticket-office',status='reported',quote='€20 (2026 tariff)',review=H,note='Recorded as Reported in the PDF ledger (ticket-office listing).')
PDF('quinta-da-regaleira','price-youth-senior','price','Youth and senior €15',{'youth':15,'senior':15,'currency':'EUR'},'src.regaleira.ticket-office',status='reported',review=H)
PDF('quinta-da-regaleira','price-family','price','Family price not published on the ticket-office listing',{'family':None},'src.regaleira.ticket-office',status='confirm-first')
PDF('quinta-da-regaleira','address','address','Quinta da Regaleira, 9, 2710-567 Sintra',{'street':'Quinta da Regaleira, 9','postcode':'2710-567','town':'Sintra'},'src.regaleira.site')
PDF('quinta-da-regaleira','phone','phone','+351 219 106 650',{'phone':'+351 219 106 650'},'src.regaleira.site')
PDF('quinta-da-regaleira','parking','access','No visitor parking',{'parking':False},'src.regaleira.site')
PDF('quinta-da-regaleira','owner','history','Owned by Sintra Town Council since 1996 (Fundação Cultursintra)',{'since':1996},'src.regaleira.site')
PDF('quinta-da-regaleira','people','history','António Augusto Carvalho Monteiro (1848–1920) and architect Luigi Manini (1848–1936)',{'carvalho_monteiro':'1848–1920','manini':'1848–1936'},'src.regaleira.site')

# ---------------- Capuchos
OFF('capuchos-convent','coordinates','coordinates','38°46’58.48”N 9°26’08.86”W',COORD("38°46'58.48\"N 9°26'08.86\"W"),PS+'visitor-map')
PDF('capuchos-convent','hours','hours','09:00–17:30; last admission 17:00',{'opens':'09:00','closes':'17:30','last_entry':'17:00'},PS+'capuchos',review=H)
PDF('capuchos-convent','price','price','Adult €11, youth €9, senior €9, family €29',{'adult':11,'youth':9,'senior':9,'family':29,'currency':'EUR'},PS+'ticket-office',quote='Adult ticket €11 (2026 tariff)',review=H)
PDF('capuchos-convent','closure-history','closure','Closed March 2025 (Storm Martinho), reopened July 2025; a February 2026 notice said it was closed again',{'closed':'2025-03','reopened':'2025-07','closed_again_notice':'2026-02'},PS+'site',status='reported',review=30)
PDF('capuchos-convent','road-closure','notice','Road traffic between Pena and the Capuchos closed (notice on 7 November 2026)',{'closed':True},PS+'site',review=30)

# ---------------- Chalet
OFF('chalet-countess-edla','coordinates','coordinates','38°47’9.41”N 9°23’58.48”W',COORD("38°47'9.41\"N 9°23'58.48\"W"),PS+'chalet-edla')
OFF('chalet-countess-edla','hours','hours','Chalet 09:00–17:30; last admission 17:00; entrance gate closed 12:00–14:00',{'opens':'09:00','closes':'17:30','last_entry':'17:00','gate_closed':'12:00–14:00'},PS+'chalet-edla',review=H)
OFF('chalet-countess-edla','ticket','price','Included in the ticket for the Park and National Palace of Pena',{'included_in':'place.sintra.pena-palace'},PS+'chalet-edla',review=H)

# ---------------- Villa Sassetti
OFF('villa-sassetti','coordinates','coordinates','38°47’44.6”N 9°23’26.4”W',COORD("38°47'44.6\"N 9°23'26.4\"W",(38.79572,-9.39067)),PS+'villa-sassetti')
OFF('villa-sassetti','hours','hours','Garden 10:00–18:00',{'opens':'10:00','closes':'18:00'},PS+'villa-sassetti',review=H)
PDF('villa-sassetti','trail','route','Villa Sassetti trail: 1,850 m, about 45 minutes',{'length_m':1850,'minutes':45},PS+'site',quote='Official route: 1.85 km, about 45 minutes, moderate difficulty')
WEB('villa-sassetti','entry','price','Free access to the garden and path',{'adult':0,'currency':'EUR'},'Garden and path access currently free')

# ---------------- Cabo da Roca
PDF('cabo-da-roca-lighthouse','coordinates','coordinates','38°46’54.94”N 9°29’50.29”W',COORD("38°46'54.94\"N 9°29'50.29\"W"),PS+'site')
OFF('cabo-da-roca-lighthouse','hours','hours','Courtyard and interpretation area 09:30–17:30',{'opens':'09:30','closes':'17:30'},PS+'cabo-da-roca-lighthouse',review=H)
OFF('cabo-da-roca-lighthouse','price-essential','price','Essential visit: €5 (adult, youth, senior), family €15',{'adult':5,'youth':5,'senior':5,'family':15,'currency':'EUR'},PS+'cabo-da-roca-lighthouse',review=H)
OFF('cabo-da-roca-lighthouse','price-panoramic','price','Panoramic visit: adult €10, youth €5, senior €7.50, family €20',{'adult':10,'youth':5,'senior':7.5,'family':20,'currency':'EUR'},PS+'cabo-da-roca-lighthouse',review=H)
OFF('cabo-da-roca-lighthouse','interpretation-centre','date','Interpretation Centre opened to the public on 23 July 2026',{'date':'2026-07-23'},PS+'news.cabo-da-roca-opening')

# ---------------- Colares
for k,kind,txt,v in [('coordinates','coordinates','38°48’21.2”N 9°26’59.9”W',COORD("38°48'21.2\"N 9°26'59.9\"W")),
    ('address','address','Av. Coronel Linhares de Lima, n.º 32, 2705-351 Colares',{'street':'Av. Coronel Linhares de Lima, n.º 32','postcode':'2705-351','town':'Colares'}),
    ('phone','phone','+351 219 291 210',{'phone':'+351 219 291 210'}),
    ('hours','hours','Monday–Saturday 09:00–13:00 and 14:00–18:00; closed Sundays and public holidays',{'days':'Mon–Sat','morning':'09:00–13:00','afternoon':'14:00–18:00','closed':'Sundays and public holidays'}),
    ('visits','rule','Guided visits and wine tastings by prior booking',{'booking_required':True}),
    ('founded','history','Founded in 1931; brings together more than 50% of the region’s production',{'founded':1931,'share_of_production':'>50%'})]:
    F('adega-regional-de-colares',k,kind,txt,v,'src.visit-sintra.adega-regional-de-colares'+('-pt' if k=='visits' else ''),'official-page-read','reported',T,None,
      note='Published by Visit Sintra (municipal tourism), not by the cellar itself: Reported, as in the PDF edition.',review=H if kind in('hours','rule') else None)
PDF('colares','demarcated','history','Colares wine region demarcated since 1908',{'since':1908},'src.visit-sintra.site',status='reported')
PDF('colares','ungrafted-vines','history','Ramisco vines grown ungrafted in sandy soils',{'ungrafted':True},'src.wines-of-portugal',status='reported')
F('colares','pr8-length-hiking-page','route','PR8 Vinho de Colares trail: circular, approx. 15.5 km (hiking page)',{'length_km':15.5},'src.visit-sintra.hiking','official-page-read','unresolved',T,None,'PR8 trail length',group='colares-pr8-length')
F('colares','pr8-length-itinerary-page','route','PR8 trail: circular, about 15 km (three-day itinerary page)',{'length_km':15},'src.visit-sintra.itinerary-3-days','official-page-read','unresolved',T,None,'PR8 trail length',group='colares-pr8-length',note='The PDF edition used “about 15 km”.')

# ---------------- Museu do Bonsai (secondary only)
for k,kind,txt,v in [('founder','history','Founded by Marco Rodrigues',{'founder':'Marco Rodrigues'}),
    ('opened','date','Opened on 21 March 2011',{'date':'2011-03-21'}),
    ('price','price','Free entry',{'adult':0,'currency':'EUR'}),
    ('address','address','Estrada Chão de Meninos 12, 2710-193 Sintra',{'street':'Estrada Chão de Meninos 12','postcode':'2710-193'})]:
    PDF('museu-do-bonsai',k,kind,txt,v,'src.press.nit',status='reported',note='Press listings only (NiT, Time Out); no official page found.')
PDF('museu-do-bonsai','hours','hours','Tuesday–Sunday 10:00–19:00 according to one listing; listings differ',{'days':'Tue–Sun','opens':'10:00','closes':'19:00'},'src.press.time-out',status='confirm-first',note='The PDF ledger records that listings differ but did not record the other values.')

# ---------------- Station and transport
PDF('sintra-station','train-from-lisbon','transport','Lisbon Rossio to Sintra: about 40 minutes by train',{'minutes':40},'src.cp',status='reported')
PDF('sintra-station','buses','transport','Bus 434 (Moorish Castle, Pena, National Palace); 435 (Regaleira, Seteais, Monserrate); 1253 (Monserrate, Capuchos, Cabo da Roca); 1624 (Cascais–Portela de Sintra via Cabo da Roca)',{'lines':'434, 435, 1253, 1624'},'src.sintra434',status='reported')
PDF('sintra-station','bus-pass','price','Scotturb 24-hour pass €10.96',{'amount':10.96,'currency':'EUR'},'src.sintra434',status='reported',review=H)

# ---------------- Website-only facts (Reported)
WEB('museu-anjos-teixeira','hours','hours','Tue–Fri 10:00–18:00; weekends 12:00–18:00; closed Mondays and most public holidays',{'tue_fri':'10:00–18:00','weekends':'12:00–18:00','closed':'Mondays, most public holidays'},'Tue–Fri 10:00–18:00; weekends 12:00–18:00. Closed Mondays and most public holidays.',review=H)
WEB('museu-anjos-teixeira','price','price','Free entry',{'adult':0,'currency':'EUR'},'**Entry:** Free.')
WEB('museu-anjos-teixeira','coordinates-approximate','coordinates','Approximate visitor-area marker',{'lat':38.79683,'lon':-9.38733},None,status='confirm-first',note='Placed by the previous edition; not checked against any source.')
WEB('parque-da-liberdade','hours','hours','Seasonal, generally from 10:00',{'opens':'10:00'},'Seasonal, generally from 10:00',review=H)
WEB('parque-da-liberdade','price','price','Free entry',{'adult':0,'currency':'EUR'},'**Entry:** Free.')
WEB('parque-da-liberdade','coordinates-approximate','coordinates','Approximate visitor-area marker',{'lat':38.79667,'lon':-9.38628},None,status='confirm-first',note='Placed by the previous edition; not checked against any source.')
WEB('miradouro-sao-martinho','price','price','Free public viewpoint',{'adult':0,'currency':'EUR'},'Free public viewpoint.')
WEB('miradouro-sao-martinho','coordinates-approximate','coordinates','Approximate visitor-area marker',{'lat':38.79644,'lon':-9.39175},None,status='confirm-first',note='Placed by the previous edition; not checked against any source.')
WEB('lawrences-hotel','founded','history','Founded in 1764',{'founded':1764},'Founded in 1764')
WEB('casa-piriquita','founded','history','Founded in 1862',{'founded':1862},'Founded in 1862')
WEB('casa-piriquita','address','address','Rua das Padarias 16, historic centre',{'street':'Rua das Padarias 16'},'Rua das Padarias 16, historic centre.')
WEB('queijadas-da-sapa','history','history','History traced to Maria Sapa in 1756; moved to Volta do Duche in 1887',{'origin':1756,'moved':1887},'traced to Maria Sapa in 1756 and its move to Volta do Duche in 1887')
WEB('queijadas-da-sapa','address','address','Volta do Duche 12',{'street':'Volta do Duche 12'},'Volta do Duche 12.')
WEB('tascantiga','address','address','Escadinhas da Fonte da Pipa 2',{'street':'Escadinhas da Fonte da Pipa 2'},'Escadinhas da Fonte da Pipa 2.')
WEB('restaurante-regional','address','address','Travessa do Município 2',{'street':'Travessa do Município 2'},'Travessa do Município 2.')
WEB('natural-history-museum','price','price','Free entry',{'adult':0,'currency':'EUR'},'Free museum · natural history')
WEB('quinta-da-regaleira','timed-ticket','rule','Tickets valid for the selected date and time',{'timed':True},'tickets are valid for the selected date and time')

os.makedirs(OUT,exist_ok=True)
for f in os.listdir(OUT): os.remove(OUT+f)
for place,facts in FACTS.items():
    with open(OUT+place+'.yaml','w') as fh:
        yaml.safe_dump({'place':f'place.sintra.{place}','facts':facts},fh,allow_unicode=True,sort_keys=False,width=1000)
print(len(FACTS),'fact files',sum(len(v) for v in FACTS.values()),'facts')
