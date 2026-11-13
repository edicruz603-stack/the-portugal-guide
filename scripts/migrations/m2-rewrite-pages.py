"""One-off M2 page rewrite: replaces every hard-coded place/event list with a loop over the canonical
dataset (src/content/destinations/sintra). Each replacement asserts the exact number of items removed."""
import re
import os
os.chdir(os.path.join(os.path.dirname(__file__), '..', '..'))
R='src/pages/'
def sub_block(s, pattern, replacement, expect, item_pat):
    m=re.search(pattern,s)
    assert m, pattern[:60]
    n=len(re.findall(item_pat,m.group(0)))
    assert n==expect,(pattern[:60],n,expect)
    return s[:m.start()]+replacement+s[m.end():]
def add_front(s, lines):
    i=s.index('---',3)
    return s[:i]+'\n'.join(lines)+'\n'+s[i:]

# ---- sintra-discoveries
p=R+'sintra-discoveries.astro'; s=open(p).read()
s=sub_block(s, r'<p class="fine" id="count" aria-live="polite">30 curated stops</p><div class="cards" id="cards">(?:<article class="place"[\s\S]*?</article>)+</div>',
  '<p class="fine" id="count" aria-live="polite">{directory.length} curated stops</p><div class="cards" id="cards">{directory.map(({ editorial }) => <DirectoryPlaceCard editorial={editorial} />)}</div>', 30, r'<article class="place"')
s=sub_block(s, r'(?:<div class="event"><strong>[\s\S]*?</p></div>)+(?=<p><a href="https://cm-sintra.pt/agenda")',
  '{diary.map(({ editorial }) => <DirectoryEvent editorial={editorial} />)}', 4, r'<div class="event">')
s=add_front(s,["import DirectoryPlaceCard from '../components/places/DirectoryPlaceCard.astro';","import DirectoryEvent from '../components/events/DirectoryEvent.astro';","import { placesInList, eventsInList } from '../lib/content/repository.ts';","const directory = await placesInList('destination.sintra', 'list.sintra.directory', 'directory');","const diary = await eventsInList('destination.sintra', 'list.sintra.events-directory', 'directory');"])
open(p,'w').write(s)

# ---- sintra-local-discoveries
p=R+'sintra-local-discoveries.astro'; s=open(p).read()
for sec,var in [('free','localFree'),('food','localFood')]:
    m=re.search(r'(<section[^>]*id="%s"[\s\S]*?<div class="cards">\s*)((?:<article class="item">[\s\S]*?</article>\s*)+)'%sec,s)
    n=len(re.findall(r'<article class="item">',m.group(2))); assert n==(8 if sec=='free' else 10),n
    s=s[:m.start(2)]+'{%s.map(({ editorial }) => <LocalPlaceItem editorial={editorial} />)}\n'%var+s[m.end(2):]
m=re.search(r'(<div class="events">\s*)((?:<div class="event">[\s\S]*?</div></div>\s*)+)(</div>)',s)
assert len(re.findall(r'<div class="event">',m.group(2)))==6
s=s[:m.start(2)]+'{diary.map(({ editorial }) => <LocalEvent editorial={editorial} />)}\n'+s[m.end(2):]
s=add_front(s,["import LocalPlaceItem from '../components/places/LocalPlaceItem.astro';","import LocalEvent from '../components/events/LocalEvent.astro';","import { placesInList, eventsInList } from '../lib/content/repository.ts';","const localFree = await placesInList('destination.sintra', 'list.sintra.local-free', 'local');","const localFood = await placesInList('destination.sintra', 'list.sintra.local-food', 'local');","const diary = await eventsInList('destination.sintra', 'list.sintra.events-local', 'local');"])
open(p,'w').write(s)

# ---- sintra (field guide)
p=R+'sintra.astro'; s=open(p).read()
def section(s,id): 
    m=re.search(r'<section[^>]*id="%s"[\s\S]*?</section>'%id,s); return m
for id,var,n in [('highlights','highlights',4),('free-sintra','freeCards',6)]:
    m=section(s,id); sec=m.group(0)
    cards=list(re.finditer(r'<article class="highlight-card">[\s\S]*?</article>',sec)); assert len(cards)==n,(id,len(cards))
    sec2=sec[:cards[0].start()]+'{%s.map(({ editorial }) => <FieldGuideCard editorial={editorial} />)}'%var+sec[cards[-1].end():]
    s=s[:m.start()]+sec2+s[m.end():]
m=section(s,'tickets'); sec=m.group(0)
cards=list(re.finditer(r'<article class="highlight-card">[\s\S]*?</article>',sec)); assert len(cards)==2 and 'Quinta da Regaleira</h3>' in cards[1].group(0)
sec2=sec[:cards[1].start()]+'{tickets.map(({ editorial }) => <FieldGuideCard editorial={editorial} />)}'+sec[cards[1].end():]
s=s[:m.start()]+sec2+s[m.end():]
m=section(s,'food-stops'); sec=m.group(0)
cards=list(re.finditer(r'<article class="food-card">[\s\S]*?</article>',sec)); assert len(cards)==4
sec2=sec[:cards[0].start()]+'{food.map(({ editorial }) => <FoodCard editorial={editorial} />)}'+sec[cards[-1].end():]
s=s[:m.start()]+sec2+s[m.end():]
m=section(s,'map'); sec=m.group(0)
links=list(re.finditer(r'<a href="https://www\.google\.com/maps[^"]*"[^>]*><span>[\s\S]*?</a>',sec)); assert len(links)==14
sec2=sec[:links[0].start()]+'{mapLinks.map(({ editorial }) => <MapLink editorial={editorial} />)}'+sec[links[-1].end():]
s=s[:m.start()]+sec2+s[m.end():]
s=s.replace("import { sintraMapPlaces } from '../data/sintra-map.ts';","import { placesInList, mapMarkers } from '../lib/content/repository.ts';\nimport FieldGuideCard from '../components/places/FieldGuideCard.astro';\nimport FoodCard from '../components/places/FoodCard.astro';\nimport MapLink from '../components/places/MapLink.astro';\nconst highlights = await placesInList('destination.sintra', 'list.sintra.field-guide-highlights', 'field_guide');\nconst freeCards = await placesInList('destination.sintra', 'list.sintra.field-guide-free', 'field_guide');\nconst tickets = await placesInList('destination.sintra', 'list.sintra.field-guide-tickets', 'field_guide_tickets');\nconst food = await placesInList('destination.sintra', 'list.sintra.field-guide-food', 'food_card');\nconst mapLinks = await placesInList('destination.sintra', 'list.sintra.map-links', 'map_link');\nconst sintraMapPlaces = await mapMarkers('destination.sintra', 'list.sintra.map');")
assert 'mapMarkers' in s
open(p,'w').write(s)

# ---- romantic
p=R+'sintra-romantic-guide.astro'; s=open(p).read()
cards=list(re.finditer(r'<article class="card">[\s\S]*?</article>\s*',s))
assert len(cards)==10
s=s[:cards[0].start()]+'{romantic.map(({ editorial }) => <RomanticPlaceCard editorial={editorial} />)}\n'+s[cards[5].end():]
s=add_front(s,["import RomanticPlaceCard from '../components/places/RomanticPlaceCard.astro';","import { placesInList } from '../lib/content/repository.ts';","const romantic = await placesInList('destination.sintra', 'list.sintra.romantic', 'romantic');"])
open(p,'w').write(s)
print('pages rewritten')
