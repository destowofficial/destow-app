#!/usr/bin/env bash
# Fetch the destination photographs the mobile app shows beside each city.
#
# The images are deliberately not in git: ~2MB of regenerable Wikimedia Commons
# files do not belong in the history. The app works without them - every list
# falls back to a pin tile - so this is optional, not part of a build.
#
# Every image is Creative Commons and commercially usable. All but the CC0 one
# require attribution, which is why credits.json is written alongside them and
# committed: the Photo credits screen reads it, and that is how we comply.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/apps/mobile/assets/cities"
UA="Destow/1.0 (mobile app; support@destow.app)"
mkdir -p "$DIR"

# City -> the Wikipedia article whose lead image represents it.
read -r -d '' CITIES <<'LIST' || true
Agra	Agra
Ahmedabad	Ahmedabad
Amritsar	Amritsar
Bengaluru	Bangalore
Chandigarh	Chandigarh
Chennai	Chennai
Coorg	Kodagu district
Dehradun	Dehradun
Delhi	Delhi
Goa	Goa
Gurugram	Gurgaon
Hyderabad	Hyderabad
Jaipur	Jaipur
Jodhpur	Jodhpur
Kolkata	Kolkata
Lonavala	Lonavla
Lucknow	Lucknow
Manali	Manali, Himachal Pradesh
Mumbai	Mumbai
Mysuru	Mysore
Nainital	Nainital
Nashik	Nashik
Noida	Noida
Ooty	Ooty
Pondicherry	Puducherry
Pune	Pune
Rishikesh	Rishikesh
Shimla	Shimla
Udaipur	Udaipur
Varanasi	Varanasi
LIST

echo "Fetching city photographs into $DIR"
: > /tmp/destow-city-src.tsv
while IFS=$'\t' read -r city article; do
  [ -z "${city:-}" ] && continue
  enc=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$article")
  src=$(curl -s -m 25 -A "$UA" "https://en.wikipedia.org/api/rest_v1/page/summary/$enc" \
    | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  print((d.get('originalimage') or d.get('thumbnail') or {}).get('source',''))
except Exception: print('')")
  if [ -z "$src" ]; then echo "  no image: $city"; continue; fi
  slug=$(printf '%s' "$city" | tr 'A-Z' 'a-z')
  if curl -s -m 40 -A "$UA" -o "$DIR/$slug.jpg" "$src" && [ -s "$DIR/$slug.jpg" ]; then
    printf '%s\t%s\n' "$city" "$src" >> /tmp/destow-city-src.tsv
    echo "  ok: $city"
  else
    echo "  failed: $city"; rm -f "$DIR/$slug.jpg"
  fi
done <<< "$CITIES"

# Lead images run to several megabytes; these are 120pt tiles.
if command -v sips >/dev/null 2>&1; then
  for f in "$DIR"/*.jpg; do sips -Z 640 -s format jpeg -s formatOptions 70 "$f" --out "$f" >/dev/null 2>&1; done
elif command -v convert >/dev/null 2>&1; then
  for f in "$DIR"/*.jpg; do convert "$f" -resize 640x640\> -quality 70 "$f"; done
else
  echo "  ! no sips or imagemagick - images left at full size"
fi

# Attribution is a condition of the licence, so it is regenerated with them.
python3 - "$DIR" <<'PY'
import json,subprocess,urllib.parse,re,sys
DIR=sys.argv[1]
UA="Destow/1.0 (mobile app; support@destow.app)"
def clean(url):
    fn=urllib.parse.unquote(url.rsplit('/',1)[-1]).split('?')[0]
    return re.sub(r'^\d+px-','',fn)
out={}
for line in open('/tmp/destow-city-src.tsv'):
    city,src=line.rstrip('\n').split('\t')
    title="File:"+clean(src)
    api=("https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo"
         "&iiprop=extmetadata&format=json&titles="+urllib.parse.quote(title,safe=''))
    artist=lic=""
    try:
        raw=subprocess.run(["curl","-s","-m","25","-A",UA,api],capture_output=True,text=True,timeout=40).stdout
        ex=list(json.loads(raw)["query"]["pages"].values())[0]["imageinfo"][0].get("extmetadata",{})
        strip=lambda v: re.sub(r"<[^>]+>","",v).strip()
        artist=strip(ex.get("Artist",{}).get("value",""))
        lic=strip(ex.get("LicenseShortName",{}).get("value",""))
    except Exception:
        pass
    out[city]={"file":clean(src),"artist":artist or "Unknown","licence":lic or "UNRESOLVED",
               "page":"https://commons.wikimedia.org/wiki/"+urllib.parse.quote(title,safe='')}
json.dump(out,open(f"{DIR}/credits.json","w"),indent=1,ensure_ascii=False)
missing=[c for c,d in out.items() if d["licence"]=="UNRESOLVED"]
print(f"credits.json written for {len(out)} photographs")
if missing: print("  ! no licence resolved for:", ", ".join(missing), "- do not ship these")
PY
