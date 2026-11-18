
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

# ---------- Fonts (free, Google Fonts, STATIC .ttf files; all carry the rupee sign):
# ---------- IBM Plex Sans Condensed Regular + SemiBold (lettering), IBM Plex Mono Regular + SemiBold (values).
# ---------- Put the four files next to this script. ----------
FONT_DIR = "./"
pdfmetrics.registerFont(TTFont("CR", FONT_DIR + "IBMPlexSansCondensed-Regular.ttf"))
pdfmetrics.registerFont(TTFont("CS", FONT_DIR + "IBMPlexSansCondensed-SemiBold.ttf"))
pdfmetrics.registerFont(TTFont("MR", FONT_DIR + "IBMPlexMono-Regular.ttf"))
pdfmetrics.registerFont(TTFont("MS", FONT_DIR + "IBMPlexMono-SemiBold.ttf"))

# ---------- Palette: drafting ink, slate, header tint, ONE CAD-teal accent for the dimension/total ----------
INK, GRAY = HexColor("#14213D"), HexColor("#55627A")
TINT, DIMC = HexColor("#E6EEF5"), HexColor("#00798C")

# ---------- Type scale (pt) ----------
WORD, DET, LBL, DATE_V, REC, ROW, TOTAL, NOTE = 26, 10.5, 8.5, 13.5, 18, 13, 24, 10
LBL_CS = 1.5

W, H = A4
M = 48
CW = W - 2 * M
LX, RX = M + 12, W - M - 12          # cell text edges
C1, C2 = M + 56, 350                 # table column lines (C2 also = date cell edge)
ROW_MIN, LEAD, LIMIT = 44, 15, 680


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


def legend(c, x, y, s, color=GRAY, anchor="l"):
    text(c, x, y, s, "CS", LBL, color, anchor=anchor, cs=LBL_CS)


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


def ln(c, x0, y0, x1, y1, lw, color=INK):
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.line(x0, H - y0, x1, H - y1)


def box(c, x, y, w, h, lw, fill=None):
    if fill is not None:
        c.setFillColor(fill)
        c.rect(x, H - y - h, w, h, fill=1, stroke=0)
    c.setStrokeColor(INK)
    c.setLineWidth(lw)
    c.rect(x, H - y - h, w, h, fill=0, stroke=1)


def poly(c, pts, fill):
    p = c.beginPath()
    p.moveTo(pts[0][0], H - pts[0][1])
    for x, y in pts[1:]:
        p.lineTo(x, H - y)
    p.close()
    c.setFillColor(fill)
    c.drawPath(p, fill=1, stroke=0)


# ---------- sheet frame: border, grid-reference band with zone ticks (no letters), centring marks ----------
def frame(c):
    box(c, 28, 28, W - 56, H - 56, 1.4)
    box(c, 34, 34, W - 68, H - 68, 0.5)
    for k in range(1, 4):                                   # 4 horizontal zones
        x = 28 + (W - 56) * k / 4
        ln(c, x, 28, x, 34, 0.5)
        ln(c, x, H - 34, x, H - 28, 0.5)
    for k in range(1, 6):                                   # 6 vertical zones
        y = 28 + (H - 56) * k / 6
        ln(c, 28, y, 34, y, 0.5)
        ln(c, W - 34, y, W - 28, y, 0.5)
    ln(c, W / 2, 10, W / 2, 40, 1.2)                        # centring marks
    ln(c, W / 2, H - 40, W / 2, H - 10, 1.2)
    ln(c, 10, H / 2, 40, H / 2, 1.2)
    ln(c, W - 40, H / 2, W - 10, H / 2, 1.2)


def note_box(c):
    w = tw(FOOTER, "CR", NOTE) + 28
    box(c, M, H - 82, w, 30, 0.5)
    text(c, M + 14, H - 63, FOOTER, "CR", NOTE, GRAY)


# ---------- title block (header block, so the business name stays top-left) ----------
def title_block(c):
    box(c, M, 48, CW, 140, 1.0)
    ln(c, M, 132, W - M, 132, 0.5)
    ln(c, C2, 48, C2, 132, 0.5)
    size = WORD
    while tw(NAME, "CS", size, 1.2) > C2 - LX - 12 and size > 14:
        size -= 0.5
    text(c, LX, 84, NAME, "CS", size, INK, cs=1.2)
    y = 104
    for s in BUSINESS_LINES:
        text(c, LX, y, s, "CR", DET, GRAY)
        y += 15
    legend(c, C2 + 12, 66, "DATE")
    text(c, C2 + 12, 104, DATE, "MS", DATE_V, INK)
    legend(c, LX, 150, "BILLED TO")
    name = BILL_TO.upper()
    size = REC
    while tw(name, "CS", size, 1) > RX - LX and size > 11:
        size -= 0.5
    text(c, LX, 176, name, "CS", size, INK, cs=1)
    return 212


# ---------- BOM grid ----------
def table_header(c, top):
    box(c, M, top, CW, 30, 0.5, fill=TINT)
    legend(c, (M + C1) / 2, top + 18, "NO.", INK, anchor="c")
    legend(c, C1 + 12, top + 18, "ITEM", INK)
    legend(c, RX, top + 18, "PRICE", INK, anchor="r")
    return top + 30


def dimension(c, yb, amt):
    xr = W - M
    xl = C2
    size = TOTAL
    arrow, pad = 9, 10
    avail = (xr - xl) - 2 * (arrow + pad) - 16
    while tw(amt, "MS", size) > avail and size > 18:
        size -= 0.5
    need = tw(amt, "MS", size) + 2 * (arrow + pad) + 16
    if need > xr - xl:
        xl = xr - need
    yd = yb + 38
    for x in (xl, xr):                                         # extension lines: small gap, run past the dimension line
        ln(c, x, yb + 3, x, yd + 5, 0.6, DIMC)
    xc = (xl + xr) / 2
    half = tw(amt, "MS", size) / 2 + 8
    ln(c, xl, yd, xc - half, yd, 0.6, DIMC)                    # dimension line, broken for the figure
    ln(c, xc + half, yd, xr, yd, 0.6, DIMC)
    poly(c, [(xl, yd), (xl + arrow, yd - 1.7), (xl + arrow, yd + 1.7)], DIMC)
    poly(c, [(xr, yd), (xr - arrow, yd - 1.7), (xr - arrow, yd + 1.7)], DIMC)
    text(c, xc, yd + 0.35 * size, amt, "MS", size, DIMC, anchor="c")
    legend(c, xl - 14, yd + 3, "TOTAL", GRAY, anchor="r")


def build():
    rows = []
    for i, (item, price) in enumerate(ITEMS, 1):
        pw = tw(money(price), "MR", ROW)
        lines = wrap(item, "CR", ROW, C2 - 12 - (C1 + 12))
        rows.append(dict(i=i, lines=lines, price=price, rh=max(ROW_MIN, 26 + LEAD * len(lines))))
    pages, cur, y = [], [], 212 + 30
    for r in rows:
        if y + r["rh"] > LIMIT and cur:
            pages.append(cur)
            cur, y = [], 116 + 30
        cur.append(r)
        y += r["rh"]
    pages.append(cur)

    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle(f"Invoice - {BILL_TO}")
    c.setAuthor("Viva Electronics")
    for p, page_rows in enumerate(pages):
        frame(c)
        if p == 0:
            top = title_block(c)
        else:
            box(c, M, 48, CW, 48, 1.0)
            text(c, LX, 80, NAME, "CS", 20, INK, cs=1.2)
            top = 116
        y0 = top
        y = table_header(c, top)
        for r in page_rows:
            mid = y + r["rh"] / 2
            text(c, (M + C1) / 2, mid + 3.9, f"{r['i']:02d}", "MR", 11, INK, anchor="c")
            n = len(r["lines"])
            fb = mid + 4.6 - LEAD * (n - 1) / 2
            for j, s in enumerate(r["lines"]):
                text(c, C1 + 12, fb + LEAD * j, s, "CR", ROW, INK)
            text(c, RX, mid + 4.6, money(r["price"]), "MR", ROW, INK, anchor="r")
            y += r["rh"]
            ln(c, M, y, W - M, y, 0.5)
        ln(c, C1, y0, C1, y, 0.5)                               # column lines
        ln(c, C2, y0, C2, y, 0.5)
        box(c, M, y0, CW, y - y0, 1.0)                          # outer border over the grid
        if p == len(pages) - 1:
            dimension(c, y, money(sum(pr for _, pr in ITEMS)))
        note_box(c)
        c.showPage()
    c.save()
    print("saved", OUT)


build()
