"""Nightly: translate the Hebrew text the city publishes (permit descriptions, work types, stages,
business types...) into English with an open-source model (Helsinki-NLP opus-mt, runs free on the
GitHub runner). Results: public/data/tx/{0-f}.json, keyed by a hash of the normalised Hebrew text.
New texts are added each night; a time budget stops the run and the rest is picked up next time."""
import json, os, re, sys, time, urllib.request, urllib.parse

GIS = "https://gisn.tel-aviv.gov.il/arcgis/rest/services/IView2/MapServer/{}/query"
OUT = "public/data/tx"
SEG = "data/tx-segments.json"
BUDGET = float(os.environ.get("TX_MINUTES", "300")) * 60
T0 = time.time()
HEB = re.compile(r"[֐-׿]")

def norm(s): return re.sub(r"\s+", " ", s or "").strip()
def fnv(s):
    h = 0x811c9dc5
    for b in s.encode("utf-8"):
        h ^= b; h = (h * 0x01000193) & 0xffffffff
    return f"{h:08x}"

def query(layer, fields, where="1=1"):
    rows, off = [], 0
    while True:
        p = urllib.parse.urlencode({"where": where, "outFields": fields, "returnGeometry": "false", "resultOffset": off, "resultRecordCount": 1000, "f": "json"})
        for a in range(3):
            try:
                with urllib.request.urlopen(urllib.request.Request(GIS.format(layer) + "?" + p, headers={"user-agent": "DiscoverTelAviv/1.0"}), timeout=60) as r:
                    j = json.load(r)
                if "error" in j: raise RuntimeError(j["error"])
                break
            except Exception as e:
                if a == 2: print(f"::warning::layer {layer}: {e}"); return rows
                time.sleep(3 * (a + 1))
        feats = j.get("features", [])
        rows += [f["attributes"] for f in feats]
        if not j.get("exceededTransferLimit") and len(feats) < 1000: break
        off += 1000
    return rows

# What appears on cards, short texts first so titles and stages are always covered.
SOURCES = [
    (772, ["sug_bakasha", "building_stage"], ["tochen_bakasha"]),
    (499, ["sug_bakasha", "matzav_bniya", "status_pikuach"], ["tochen_bakasha"]),
    (479, ["mahut", "shaot_between"], []),
    (852, ["mahut_avoda", "tzimtzum_netivim", "sivug_yom_layla"], ["commnets"]),
    (591, ["t_tzav"], []),
    (858, ["gorem_yozem_rishayon", "taarichim_shaot"], []),
    (761, ["mikta_teor", "plan_name"], []),
    (762, ["mikta_teor", "plan_name"], []),
    (575, ["t_sug"], []),
    (528, ["t_status"], []),
]
short, long_ = set(), set()
for layer, sf, lf in SOURCES:
    rows = query(layer, ",".join(sf + lf))
    if layer == 772:  # skip long-finished permits
        rows = [r for r in rows if not re.search("תעודת גמר|אכלוס|בוטל|נסגר", r.get("building_stage") or "")]
    for r in rows:
        for f in sf:
            v = norm(r.get(f)); 
            if v and HEB.search(v): short.add(v)
        for f in lf:
            v = norm(r.get(f))
            if v and HEB.search(v): long_.add(v)
    print(f"layer {layer}: {len(rows)} rows")
# Businesses licensed in the last year: their type description.
biz = query(964, "t_hesber_mahut_esek,taarich_kabalat_rishayon", f"taarich_kabalat_rishayon >= '{time.strftime('%Y-%m-%d', time.gmtime(time.time() - 400 * 86400))}'")
if not biz:
    biz = [r for r in query(964, "t_hesber_mahut_esek,taarich_kabalat_rishayon") if str(r.get("taarich_kabalat_rishayon") or "") >= time.strftime('%Y-%m-%d', time.gmtime(time.time() - 400 * 86400))]
for r in biz:
    v = norm(r.get("t_hesber_mahut_esek"))
    if v and HEB.search(v): short.add(v)
print(f"texts: {len(short)} short, {len(long_)} long")

# Load what's done.
shards = {}
for c in "0123456789abcdef":
    try: shards[c] = json.load(open(f"{OUT}/{c}.json"))
    except Exception: shards[c] = {}
segs = {}
try: segs = json.load(open(SEG))
except Exception: pass
done = lambda t: fnv(t) in shards[fnv(t)[0]]
todo = [t for t in sorted(short, key=len) if not done(t)] + [t for t in sorted(long_, key=len) if not done(t)]
print(f"to translate: {len(todo)}")
if not todo: sys.exit(0)

from transformers import MarianMTModel, MarianTokenizer
import torch
torch.set_num_threads(os.cpu_count() or 4)
NAME = "Helsinki-NLP/opus-mt-tc-big-he-en"
tok = MarianTokenizer.from_pretrained(NAME); model = MarianMTModel.from_pretrained(NAME).eval()

def split(t):
    # Sentences and list items, keeping the separators so the result reads naturally.
    parts = re.split(r"(\n|;|(?<=[.:])\s+|,\s+(?=\S{2,}\s\S))", t)
    out = []
    for p in parts:
        if p is None or p == "": continue
        if re.fullmatch(r"\n|;|\s+|,\s+", p): out.append(("sep", p)); continue
        out.append(("txt", p))
    return out

def run(batch):
    with torch.no_grad():
        enc = tok(batch, return_tensors="pt", padding=True, truncation=True, max_length=256)
        gen = model.generate(**enc, num_beams=2, max_new_tokens=256)
    return tok.batch_decode(gen, skip_special_tokens=True)

def save():
    os.makedirs(OUT, exist_ok=True)
    for c, m in shards.items():
        json.dump(m, open(f"{OUT}/{c}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(segs, open(SEG, "w"), ensure_ascii=False, separators=(",", ":"))

i, n = 0, 0
while i < len(todo) and time.time() - T0 < BUDGET:
    chunk = todo[i:i + 40]; i += 40
    pieces = {t: split(t[:1500]) for t in chunk}
    need = sorted({p for ps in pieces.values() for k, p in ps if k == "txt" and HEB.search(p) and norm(p) not in segs}, key=len)
    for b in range(0, len(need), 24):
        batch = need[b:b + 24]
        for src, en in zip(batch, run(batch)):
            segs[norm(src)] = en.strip()
    for t, ps in pieces.items():
        en = "".join((segs.get(norm(p), p) if k == "txt" and HEB.search(p) else (", " if p.startswith(",") else p)) for k, p in ps)
        h = fnv(t); shards[h[0]][h] = norm(en) if "\n" not in t else en.strip()
        n += 1
    if n % 400 < 40: save(); print(f"{n} done, {int(time.time() - T0)}s")
save()
left = len(todo) - n
print(f"::notice::translated {n}, {left} left for the next run")
