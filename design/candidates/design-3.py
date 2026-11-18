
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white

# ---------- Invoice data (existing content only) ----------
NAME = "VIVA ELECTRONICS"
BUSINESS_LINES = ["Chettiyamkinar, Kottakkal, Malappuram, Kerala",
                  "9995880059  ·  9633334786"]
DATE = "10 November 2026"
BILL_TO = "Illikkal Auditorium"
ITEMS = [("Sub Amp Servicing", 900.00)]
FOOTER = "Thank you for your business."
OUT = "invoice.pdf"

# ---------- Fonts (free): FreeSans + FreeSans Bold (Helvetica clone, has the rupee sign),
# ---------- DejaVu Sans Mono Bold (readout). Put the three .ttf files next to this script. ----------
FONT_DIR = "./"
pdfmetrics.registerFont(TTFont("S", FONT_DIR + "FreeSans.ttf"))
pdfmetrics.registerFont(TTFont("SB", FONT_DIR + "FreeSansBold.ttf"))
pdfmetrics.registerFont(TTFont("M", FONT_DIR + "DejaVuSansMono-Bold.ttf"))

# ---------- Palette: warm greys + charcoal, ONE functional accent ----------
MOD, GRAY, INK = HexColor("#F1F0EC"), HexColor("#5E5C56"), HexColor("#1B1B1B")
TICK, HAIR = HexColor("#BDBBB3"), HexColor("#DAD8D1")
CHAR, BEZEL, DLEG = HexColor("#1E1E1D"), HexColor("#3C3B38"), HexColor("#A8A59C")
ORANGE = HexColor("#F2681A")

# ---------- Type scale (pt) ----------
LBL, BODY, ROW, DATE_V, REC, WORD, TOTAL = 8.5, 10, 12.5, 13, 17, 20, 34

W, H = A4
M, G, R = 48, 8, 8          # margin, gutter, module radius (one radius everywhere)
CW = W - 2 * M
ROW_H, LEAD = 52, 15
LIMIT = 650                 # rows end above this so the total window + footer always fit


def tw(s, font, size, hs=100, cs=0):
    return pdfmetrics.stringWidth(s, font, size) * hs / 100 + cs * hs / 100 * len(s)


def text(c, x, y, s, font, size, color, anchor="l", hs=100, cs=0):
    w = tw(s, font, size, hs, cs)
    if anchor == "r":
        x -= w
    elif anchor == "c":
        x -= w / 2
    t = c.beginText(x, H - y)
    t.setFont(font, size)
    t.setHorizScale(hs)
    t.setCharSpace(cs)
    c.setFillColor(color)
    t.textOut(s)
    t.setCharSpace(0)
    t.setHorizScale(100)
    c.drawText(t)


def legend(c, x, y, s, color=GRAY, anchor="l"):
    text(c, x, y, s, "SB", LBL, color, anchor=anchor, cs=1.6)


def rrect(c, x, y, w, h, r, fill):
    c.setFillColor(fill)
    c.roundRect(x, H - y - h, w, h, r, fill=1, stroke=0)


def line(c, x0, x1, y, color, lw=0.8):
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.line(x0, H - y, x1, H - y)


def money(v):
    whole, frac = f"{v:.2f}".split(".")
    if len(whole) > 3:
        head, tail, parts = whole[:-3], whole[-3:], []
        while len(head) > 2:
            parts.insert(0, head[-2:])
            head = head[:-2]
        if head:
            parts.insert(0, head)
        whole = ",".join(parts + [tail])
    return f"\u20b9{whole}.{frac}"


def wrap(s, font, size, maxw):
    lines, cur = [], ""
    for w in s.split():
        t = (cur + " " + w).strip()
        if tw(t, font, size) <= maxw:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [s]


def footer(c):
    line(c, M, W - M, H - 66, HAIR)
    text(c, M, H - 44, FOOTER, "S", 9, GRAY)


def brand_module(c):
    rrect(c, M, 48, 335, 92, R, MOD)
    size = WORD
    while tw(NAME, "SB", size, 118, 1.2) > 335 - 36 and size > 12:
        size -= 0.5
    text(c, M + 18, 86, NAME, "SB", size, INK, hs=118, cs=1.2)
    y = 108
    for ln in BUSINESS_LINES:
        text(c, M + 18, y, ln, "S", BODY, GRAY)
        y += 14
    dx = M + 335 + G
    rrect(c, dx, 48, CW - 335 - G, 92, R, MOD)
    legend(c, dx + 16, 78, "DATE")
    text(c, dx + 16, 108, DATE, "SB", DATE_V, INK)


def billed_module(c):
    rrect(c, M, 148, CW, 68, R, MOD)
    legend(c, M + 18, 174, "BILLED TO")
    size = REC
    while tw(BILL_TO, "SB", size) > CW - 36 and size > 11:
        size -= 0.5
    text(c, M + 18, 199, BILL_TO, "SB", size, INK)


def table_header(c, top):
    legend(c, M + 30, top + 22, "NO.", anchor="c")
    legend(c, M + 58, top + 22, "ITEM")
    legend(c, W - M - 18, top + 22, "PRICE", anchor="r")
    sy = top + 31                                   # dial-scale ruler
    line(c, M + 18, W - M - 18, sy, TICK, 0.7)
    x, i = M + 18, 0
    c.setStrokeColor(TICK)
    c.setLineWidth(0.7)
    while x <= W - M - 18 + 0.01:
        ln = 7 if i % 5 == 0 else 3.6
        c.line(x, H - sy, x, H - sy - ln)
        x += 8
        i += 1


def total_window(c, y, amt):
    wx, ww, wh = W - M - 300, 300, 84
    rrect(c, wx, y, ww, wh, 8, CHAR)
    c.setStrokeColor(BEZEL)
    c.setLineWidth(0.8)
    c.roundRect(wx + 3, H - y - wh + 3, ww - 6, wh - 6, 6, fill=0, stroke=1)
    legend(c, wx + 22, y + 28, "TOTAL", color=DLEG)
    c.setFillColor(ORANGE)                          # the indicator light
    c.circle(wx + 22 + tw("TOTAL", "SB", LBL, 100, 1.6) + 9, H - (y + 25), 2.6, fill=1, stroke=0)
    size = TOTAL
    while pdfmetrics.stringWidth(amt, "M", size) > ww - 44 and size > 14:
        size -= 0.5
    text(c, wx + ww - 22, y + 66, amt, "M", size, ORANGE, anchor="r")


def build():
    # paginate rows
    rows = []
    for i, (item, price) in enumerate(ITEMS, 1):
        pw = tw(money(price), "SB", ROW)
        lines = wrap(item, "S", ROW, (W - M - 18) - pw - 24 - (M + 58))
        rows.append(dict(i=i, lines=lines, price=price, rh=max(ROW_H, 38 + LEAD * (len(lines) - 1))))
    pages, cur, y = [], [], 224 + 40
    for r in rows:
        if y + r["rh"] > LIMIT and cur:
            pages.append(cur)
            cur, y = [], 100 + 40
        cur.append(r)
        y += r["rh"]
    pages.append(cur)

    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle(f"Invoice - {BILL_TO}")
    c.setAuthor("Viva Electronics")
    for p, page_rows in enumerate(pages):
        if p == 0:
            brand_module(c)
            billed_module(c)
            top = 224
        else:
            rrect(c, M, 48, CW, 44, R, MOD)
            text(c, M + 18, 76, NAME, "SB", 15, INK, hs=118, cs=1.2)
            top = 100
        mh = 40 + sum(r["rh"] for r in page_rows) + 8
        rrect(c, M, top, CW, mh, R, MOD)
        table_header(c, top)
        y = top + 40
        for k, r in enumerate(page_rows):
            mid = y + r["rh"] / 2
            c.setStrokeColor(INK)
            c.setLineWidth(1)
            c.circle(M + 30, H - mid, 11, fill=0, stroke=1)
            text(c, M + 30, mid + 3.5, f"{r['i']:02d}", "SB", 9.5, INK, anchor="c")
            n = len(r["lines"])
            fb = mid + 4.5 - LEAD * (n - 1) / 2
            for j, ln in enumerate(r["lines"]):
                text(c, M + 58, fb + LEAD * j, ln, "S", ROW, INK)
            text(c, W - M - 18, mid + 4.5, money(r["price"]), "SB", ROW, INK, anchor="r")
            y += r["rh"]
            if k < len(page_rows) - 1:
                line(c, M + 18, W - M - 18, y, white, 1.6)
        if p == len(pages) - 1:
            total_window(c, top + mh + G, money(sum(pr for _, pr in ITEMS)))
        footer(c)
        c.showPage()
    c.save()
    print("saved", OUT)


build()


