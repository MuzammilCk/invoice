
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

# ---------- Invoice data (existing content only) ----------
NAME = "VIVA ELECTRONICS"
BUSINESS_LINES = ["Chettiyamkinar, Kottakkal, Malappuram, Kerala",
                  "9995880059  ·  9633334786"]
DATE = "10 November 2026"
BILL_TO = "Illikkal Auditorium"
ITEMS = [("Sub Amp Servicing", 900.00)]
FOOTER = "Thank you for your business."
OUT = "invoice.pdf"

# ---------- Fonts (free, Google Fonts): Poiret One Regular (wordmark only) + Josefin Sans Regular & SemiBold
# ---------- (use the STATIC .ttf files; Josefin Sans includes the rupee sign). Put them next to this script. ----------
FONT_DIR = "./"
pdfmetrics.registerFont(TTFont("PO", FONT_DIR + "PoiretOne-Regular.ttf"))
pdfmetrics.registerFont(TTFont("JR", FONT_DIR + "JosefinSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("JS", FONT_DIR + "JosefinSans-SemiBold.ttf"))

# ---------- Palette: emerald-black, antique gold, ivory ----------
INK, GOLD, GOLDL = HexColor("#0B2B26"), HexColor("#B08D3E"), HexColor("#D2AE5E")
IVORY, CREAM, DIM = HexColor("#F4EEDD"), HexColor("#F7F2E6"), HexColor("#BFC7BE")
GRAY, HAIR = HexColor("#4F5E59"), HexColor("#D9C79B")

# ---------- Type scale (pt) ----------
WORD, DET, LBL, DATE_V, REC, ROW, TOTAL, FOOT = 28, 10.5, 9, 14, 17, 13, 32, 9.5
WORD_CS, LBL_CS = 4, 2

W, H = A4
M = 48
CW = W - 2 * M
LX, RX = 64, W - M - 16          # left / right text edges shared by every section
ROW_H, LEAD, LIMIT = 56, 15, 640


# ---------- helpers (y is measured DOWN from the top edge) ----------
def tw(s, font, size, cs=0):
    return pdfmetrics.stringWidth(s, font, size) + cs * len(s)


def text(c, x, y, s, font, size, color, anchor="l", cs=0):
    w = tw(s, font, size, cs)
    if anchor == "r":
        x -= w
    elif anchor == "c":
        x -= w / 2
    t = c.beginText(x, H - y)
    t.setFont(font, size)
    t.setCharSpace(cs)
    c.setFillColor(color)
    t.textOut(s)
    t.setCharSpace(0)
    c.drawText(t)


def legend(c, x, y, s, color, anchor="l"):
    text(c, x, y, s, "JS", LBL, color, anchor=anchor, cs=LBL_CS)


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


def stepped(x, y, w, h, s, n):
    """Rectangle whose four corners are cut as n-step staircases of size s."""
    p = [(x + n * s, y)]
    for k in range(n):
        p += [(x + w - (n - 1 - k) * s, y + k * s), (x + w - (n - 1 - k) * s, y + (k + 1) * s)]
    for k in range(n):
        p += [(x + w - k * s, y + h - (n - 1 - k) * s), (x + w - (k + 1) * s, y + h - (n - 1 - k) * s)]
    for k in range(n):
        p += [(x + n * s - (k + 1) * s, y + h - k * s), (x + n * s - (k + 1) * s, y + h - (k + 1) * s)]
    for k in range(n):
        p += [(x + k * s, y + n * s - (k + 1) * s), (x + (k + 1) * s, y + n * s - (k + 1) * s)]
    return p


def plinth(x, y, w, h, d=0):
    """Ziggurat silhouette: widest at the base, two setbacks toward the top. d = inward offset."""
    return [(x + d, y + h - d), (x + d, y + h - 28 + d), (x + 6 + d, y + h - 28 + d),
            (x + 6 + d, y + h - 56 + d), (x + 12 + d, y + h - 56 + d), (x + 12 + d, y + d),
            (x + w - 12 - d, y + d), (x + w - 12 - d, y + h - 56 + d), (x + w - 6 - d, y + h - 56 + d),
            (x + w - 6 - d, y + h - 28 + d), (x + w - d, y + h - 28 + d), (x + w - d, y + h - d)]


def shape(c, pts, fill=None, stroke=None, lw=0.8):
    p = c.beginPath()
    p.moveTo(pts[0][0], H - pts[0][1])
    for x, y in pts[1:]:
        p.lineTo(x, H - y)
    p.close()
    if fill is not None:
        c.setFillColor(fill)
    if stroke is not None:
        c.setStrokeColor(stroke)
        c.setLineWidth(lw)
    c.drawPath(p, fill=1 if fill is not None else 0, stroke=1 if stroke is not None else 0)


def hline(c, y, color, lw=0.7, x0=M, x1=W - M):
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.line(x0, H - y, x1, H - y)


def double_rule(c, y):
    hline(c, y, GOLD, 1.4)
    hline(c, y + 3.5, GOLD, 0.6)


def frame(c):
    shape(c, stepped(24, 24, W - 48, H - 48, 8, 3), stroke=GOLD, lw=1.4)
    shape(c, stepped(30, 30, W - 60, H - 60, 8, 3), stroke=INK, lw=0.6)


def footer(c):
    tws = tw(FOOTER, "JR", FOOT)
    cx, by = W / 2, H - 48
    text(c, cx, by, FOOTER, "JR", FOOT, GRAY, anchor="c")
    hline(c, by - 3.5, GOLD, 0.6, M, cx - tws / 2 - 16)
    hline(c, by - 3.5, GOLD, 0.6, cx + tws / 2 + 16, W - M)


def band(c, h):
    shape(c, stepped(M, 48, CW, h, 6, 2), fill=INK)
    shape(c, stepped(M + 4, 52, CW - 8, h - 8, 6, 2), stroke=GOLDL, lw=0.8)


def first_page_top(c):
    band(c, 104)
    size = WORD
    while tw(NAME, "PO", size, WORD_CS) > 320 and size > 14:
        size -= 0.5
    text(c, LX, 92, NAME, "PO", size, CREAM, cs=WORD_CS)
    y = 118
    for ln in BUSINESS_LINES:
        text(c, LX, y, ln, "JR", DET, DIM)
        y += 15
    legend(c, RX, 92, "DATE", GOLDL, anchor="r")
    text(c, RX, 118, DATE, "JS", DATE_V, CREAM, anchor="r")

    # billed to: a three-line "pilaster" instead of a box
    for dx, lw in ((0, 1.4), (4, 0.7), (7.5, 0.7)):
        c.setStrokeColor(GOLD)
        c.setLineWidth(lw)
        c.line(M + dx, H - 188, M + dx, H - 234)
    legend(c, LX, 202, "BILLED TO", GRAY)
    name = BILL_TO.upper()
    size = REC
    while tw(name, "JS", size, 1.5) > RX - LX and size > 11:
        size -= 0.5
    text(c, LX, 226, name, "JS", size, INK, cs=1.5)
    return 270


def table_header(c, top):
    double_rule(c, top)
    shape(c, stepped(M, top + 11, CW, 26, 4, 2), fill=IVORY)
    legend(c, M + 29, top + 28, "NO.", INK, anchor="c")
    legend(c, LX + 44, top + 28, "ITEM", INK)
    legend(c, RX, top + 28, "PRICE", INK, anchor="r")
    return top + 45


def total_plinth(c, y, amt):
    x, w, h = W - M - 300, 300, 84
    shape(c, plinth(x, y, w, h), fill=INK)
    shape(c, plinth(x, y, w, h, 4), stroke=GOLDL, lw=0.8)
    legend(c, x + 28, y + 30, "TOTAL", GOLDL)
    size = TOTAL
    while tw(amt, "JS", size) > RX - (x + 28) - 12 and size > 14:
        size -= 0.5
    text(c, RX, y + 66, amt, "JS", size, CREAM, anchor="r")


def build():
    rows = []
    for i, (item, price) in enumerate(ITEMS, 1):
        pw = tw(money(price), "JS", ROW)
        lines = wrap(item, "JR", ROW, RX - pw - 24 - (LX + 44))
        rows.append(dict(i=i, lines=lines, price=price, rh=max(ROW_H, 38 + LEAD * (len(lines) - 1))))
    pages, cur, y = [], [], 270 + 45
    for r in rows:
        if y + r["rh"] > LIMIT and cur:
            pages.append(cur)
            cur, y = [], 128 + 45
        cur.append(r)
        y += r["rh"]
    pages.append(cur)

    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle(f"Invoice - {BILL_TO}")
    c.setAuthor("Viva Electronics")
    for p, page_rows in enumerate(pages):
        frame(c)
        if p == 0:
            top = first_page_top(c)
        else:
            band(c, 56)
            text(c, LX, 86, NAME, "PO", 20, CREAM, cs=3)
            top = 128
        y = table_header(c, top)
        for k, r in enumerate(page_rows):
            mid = y + r["rh"] / 2
            shape(c, [(M + 29, mid - 13), (M + 42, mid), (M + 29, mid + 13), (M + 16, mid)], stroke=GOLD, lw=1)
            text(c, M + 29, mid + 3.4, f"{r['i']:02d}", "JS", 9.5, INK, anchor="c")
            n = len(r["lines"])
            fb = mid + 4.5 - LEAD * (n - 1) / 2
            for j, ln in enumerate(r["lines"]):
                text(c, LX + 44, fb + LEAD * j, ln, "JR", ROW, INK)
            text(c, RX, mid + 4.5, money(r["price"]), "JS", ROW, INK, anchor="r")
            y += r["rh"]
            if k < len(page_rows) - 1:
                hline(c, y, HAIR, 0.7)
        double_rule(c, y)
        if p == len(pages) - 1:
            total_plinth(c, y + 3.5 + 28, money(sum(pr for _, pr in ITEMS)))
        footer(c)
        c.showPage()
    c.save()
    print("saved", OUT)


build()

