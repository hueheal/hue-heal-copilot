import os
OUT = os.path.dirname(os.path.abspath(__file__))
A = "/Users/maria/Claude/remedae/public/assets"
I = A + "/IMAGERY"
LOGO_DARK = "file:///Users/maria/Claude/remedae/public/brand/remedae-dark.svg"
LOGO_LIGHT = "file:///Users/maria/Claude/remedae/public/brand/remedae-light.svg"
def f(p): return "file://" + p.replace(" ", "%20")

HEAD = """<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Quando&family=Poppins:wght@300;400;500&display=swap">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden}
body{position:relative;font-family:'Poppins',sans-serif}
.q{font-family:'Quando',Georgia,serif;font-weight:400}
.footer{display:flex;justify-content:space-between;align-items:center}
.url{font-family:'Poppins';font-weight:500;font-size:31px;line-height:46px;display:flex;gap:15px}
</style></head><body>"""
END = "</body></html>"

def dark_footer():
    return f"""<div style="border-top:2.6px solid rgba(255,255,232,.15);padding-top:41px;margin-top:21px">
  <div class="footer"><img src="{LOGO_LIGHT}" style="width:237px;height:41px">
  <div class="url" style="color:#e9e0c4"><span>www.remedae.app</span><span>›</span></div></div></div>"""

def cover(img, title_html, sub):
    return HEAD + f"""<div style="position:absolute;inset:0;background:#f7f4ea;overflow:hidden">
  <img src="{img}" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover;object-position:50% 100%">
</div>
<div style="position:absolute;left:79px;top:63px;width:953px" class="footer">
  <img src="{LOGO_DARK}" style="width:237px;height:41px">
  <div class="url" style="color:#1a2b1e"><span>www.remedae.app</span><span>›</span></div>
</div>
<div class="q" style="position:absolute;left:115px;width:850px;top:190px;text-align:center;font-size:102px;line-height:110px;letter-spacing:-.1em;word-spacing:.12em;color:#131a15">{title_html}</div>
<div style="position:absolute;left:190px;width:700px;top:555px;text-align:center;text-wrap:balance;font-size:35px;line-height:54px;color:#131a15">{sub}</div>
""" + END

def leadup(img, pill, head, body):
    return HEAD + f"""<div style="position:absolute;inset:0;background:#131a15;overflow:hidden">
  <img src="{img}" style="position:absolute;left:-10px;top:-120px;width:1122px;height:1500px;object-fit:cover;opacity:.2">
  <div style="position:absolute;left:0;right:0;top:379px;bottom:0;background:linear-gradient(180deg,rgba(54,76,63,0),#131a15)"></div>
</div>
<div style="position:absolute;left:62px;top:36px;background:rgba(54,76,63,.52);border-radius:999px;padding:10px 26px;color:#a6d893;font-weight:500;font-size:26px;line-height:39px;letter-spacing:.14em;text-transform:uppercase">{pill}</div>
<div style="position:absolute;left:62px;right:62px;bottom:62px;display:flex;flex-direction:column;gap:41px">
  <div class="q" style="font-size:70px;line-height:75px;letter-spacing:-.045em;color:#ffffe8">{head}</div>
  <div style="font-size:35px;line-height:54px;color:#e9e0c4">{body}</div>
  {dark_footer()}
</div>""" + END

def remedy(n, tradition, eyebrow, title, body, note):
    return HEAD + f"""<div style="position:absolute;inset:0;background:#131a15">
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,#121a14 0%,#172419 58%,#131c16 100%)"></div>
</div>
<div class="q" style="position:absolute;left:62px;top:94px;font-size:57px;line-height:65px;letter-spacing:-.02em;color:#a6d893">{tradition}</div>
<div class="q" style="position:absolute;right:62px;top:94px;font-size:57px;line-height:65px;letter-spacing:-.02em;color:#e9e0c4">{n}</div>
<div style="position:absolute;left:62px;right:62px;top:577px;bottom:62px;display:flex;flex-direction:column">
  <div style="font-weight:500;font-size:26px;letter-spacing:.14em;text-transform:uppercase;color:rgba(166,216,147,.7);margin-bottom:41px">{eyebrow}</div>
  <div class="q" style="font-size:80px;line-height:84px;letter-spacing:-.06em;word-spacing:.08em;color:#ffffe8;margin-bottom:34px">{title}</div>
  <div style="font-size:35px;line-height:54px;color:#e9e0c4;max-width:940px">{body}</div>
  <div style="margin-top:26px;font-size:26px;line-height:38px;color:rgba(166,216,147,.75)">{note}</div>
  <div style="margin-top:auto">{dark_footer()}</div>
</div>""" + END

def end(eyebrow, head, desc, cards, disclaimer):
    rows = "".join(f"""<div style="display:flex;align-items:center;gap:28px;background:#1a2b1e;border:1.6px solid rgba(166,216,147,.06);border-radius:19px;padding:24px 30px 24px 24px">
  <div style="width:124px;height:124px;flex-shrink:0;border-radius:16px;border:1.6px solid rgba(255,255,232,.3);background:url('{c['img']}') {c.get('pos','50% 50%')}/cover"></div>
  <div style="flex:1;min-width:0">
    <div style="font-weight:500;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:rgba(166,216,147,.7);margin-bottom:8px">{c['eyebrow']}</div>
    <div class="q" style="font-size:40px;line-height:46px;letter-spacing:-.03em;color:#ffffe8">{c['title']}</div>
    <div style="font-weight:300;font-size:25px;line-height:36px;color:rgba(255,255,232,.62);margin-top:4px">{c['line']}</div>
  </div>
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(166,216,147,.45)" stroke-width="2.4" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>
</div>""" for c in cards)
    return HEAD + f"""<div style="position:absolute;inset:0;background:#060b08"></div>
<div style="position:absolute;left:60px;right:60px;top:96px;text-align:center">
  <div style="font-weight:500;font-size:23px;letter-spacing:.14em;text-transform:uppercase;color:rgba(166,216,147,.7)">{eyebrow}</div>
  <div class="q" style="font-size:60px;line-height:68px;letter-spacing:-.035em;color:#ffffe8;margin-top:20px;white-space:nowrap">{head}</div>
  <div style="font-weight:300;font-size:33px;line-height:48px;color:rgba(255,255,232,.72);margin-top:18px">{desc}</div>
</div>
<div style="position:absolute;left:80px;right:80px;top:356px;display:flex;flex-direction:column;gap:20px">{rows}</div>
<div style="position:absolute;left:150px;right:150px;bottom:62px;text-align:center;font-weight:300;font-size:22px;line-height:32px;color:rgba(255,255,232,.55)">{disclaimer}</div>
""" + END

slides = [
  cover("file://" + OUT + "/figma-cover.png",
        'How women have been <span style="color:#364c3f">healing</span> across the world<span style="color:#a6d893">.</span>',
        "Four remedies you can find in your kitchen"),
  leadup(f(I + "/Traditions/AYURVEDA/AyurvedaFresh-Ginger.png"), "Women&rsquo;s health",
        "A lot of women&rsquo;s medicine never lived in a pharmacy. It lived in the kitchen.",
        "Seeds in a jar. A root by the stove. A pot of something warm. Four traditions, four remedies you may already own."),
  remedy("01", "Naturopathy - Europe", "For nausea in early pregnancy", "Fresh ginger tea",
        "Grate a thumb of ginger into hot water. A 2014 review of 1,278 people found it eased early pregnancy nausea as well as vitamin B6.",
        "Up to four cups a day. Check with your midwife first."),
  remedy("02", "Ayurveda - South Asia", "For irregular cycles with PCOS", "Fennel seed decoction",
        "Boil the seeds, let it cool, sip it daily. In a small 2018 trial of 30 women, it kept pace with the pill on cycle regularity.",
        "Never swap prescribed care without your doctor."),
  remedy("03", "Unani - Greece", "For a bloated belly", "Ajwain seed water",
        "A pinch of carom seeds stirred into warm water, sipped before you eat. Unani uses it to warm digestion and settle gas.",
        "Sold as ajwain or carom seed in most spice aisles."),
  remedy("04", "African - The Cape", "For the menopause years", "Honeybush tea",
        "Two or three unsweetened cups a day. A Cape herbal remedy for menopausal symptoms, rich in the same antioxidants as rooibos.",
        "Brew it from dried honeybush leaves."),
  end("Women&rsquo;s health across the world", "Save this for your next shop.",
      "Four jars worth keeping. Find the rest on remedae.app",
      [
        {"img": f(I + "/Item Macros/Ginger-drink.png"), "eyebrow": "Naturopathy &middot; Pregnancy", "title": "Fresh ginger tea", "line": "For nausea in early pregnancy."},
        {"img": f(A + "/womens-health-cycles-01.jpg"), "pos": "50% 70%", "eyebrow": "Ayurveda &middot; Cycles", "title": "Fennel seed decoction", "line": "For irregular cycles with PCOS."},
        {"img": f(I + "/Solo lifestyles/Woman-GutAche.png"), "pos": "40% 60%", "eyebrow": "Unani &middot; Everyday", "title": "Ajwain seed water", "line": "For a bloated belly, before you eat."},
        {"img": f(A + "/womens-health-hero-01.jpg"), "pos": "30% 40%", "eyebrow": "African &middot; Menopause", "title": "Honeybush tea", "line": "For the menopause years."},
      ],
      "Remedae is an educational library, not a clinic. Speak with a credentialed practitioner."),
]
for i, html in enumerate(slides, 1):
    open(f"{OUT}/slide-{i}.html", "w").write(html)
print(len(slides), "slides written")
