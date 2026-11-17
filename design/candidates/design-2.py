
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white

# ---------- Invoice data (edit for each new invoice) ----------
NAME_1, NAME_2 = "VIVA", "ELECTRONICS"
BUSINESS_LINES = ["Chettiyamkinar, Kottakkal, Malappuram, Kerala",
                  "9995880059  ·  9633334786"]
DATE = "10 November 2026"
BILL_TO = "Illikkal Auditorium"
ITEMS = [("Sub Amp Servicing", 900.00)]          # (item name, price in rupees)
FOOTER = "Thank you for your business."
OUT = "invoice.pdf"

# ---------- Fonts: Poppins Regular / Medium / Bold (free, Google Fonts) ----------
FONT_DIR = "./"
pdfmetrics.registerFont(TTFont("P", FONT_DIR + "Poppins-Regular.ttf"))
pdfmetrics.registerFont(TTFont("PM", FONT_DIR + "Poppins-Medium.ttf"))
pdfmetrics.registerFont(TTFont("PB", FONT_DIR + "Poppins-Bold.ttf"))

# ---------- Palette ----------
INK, BLUE = HexColor("#0D0F1A"), HexColor("#2F3BFF")
GRAY, RULE = HexColor("#555A6B"), HexColor("#D9DBE6")

# ---------- Type scale (pt) ----------
BODY, LBL, ROW, DATE_V, REC = 10, 8.5, 12.5, 11.5, 19
WORD_V, WORD_E, TOTAL = 56, 34, 32
LEAD, ROW_H, LIMIT = 15, 56, 712

W, H = A4
M = 48


# ---------- helpers (all y values are measured DOWN from the top edge) ----------
def tw(s, font, size, hs=100, cs=0):
    return pdfmetrics.stringWidth(s, font, size) * hs / 100 + cs * len(s)


def fit(s, font, target, hs=100):
    return target / (pdfmetrics.stringWidth(s, font, 1) * hs / 100)


def text(c, x, y, s, font, size, color, anchor="l", hs=100, cs=0, outline=None, lw=1.0):
    w = tw(s, font, size, hs, cs)
    if anchor == "r":
        x -= w
    t = c.beginText(x, H - y)
    t.setFont(font, size)
    t.setHorizScale(hs)            # percent: 68 = squeezed to 68% width
    t.setCharSpace(cs)
    if outline is not None:        # outline-only text
        c.setStrokeColor(outline)
        c.setLineWidth(lw)
        t.setTextRenderMode(1)
    else:
        c.setFillColor(color)
    t.textOut(s)
    t.setTextRenderMode(0)
    t.setCharSpace(0)
    t.setHorizScale(100)
    c.drawText(t)


def label(c, x, y, s, color, anchor="l"):
    text(c, x, y, s, "PM", LBL, color, anchor=anchor, cs=1.6)


def poly(c, pts, fill):
    p = c.beginPath()
    p.moveTo(pts[0][0], H - pts[0][1])
    for x, y in pts[1:]:
        p.lineTo(x, H - y)
    p.close()
    c.setFillColor(fill)
    c.drawPath(p, fill=1, stroke=0)


def hline(c, y, color, lw=0.8):
    c.setStrokeColor(color)
    c.setLineWidth(lw)
    c.line(M, H - y, W - M, H - y)


def money(v):
    """Rupees with Indian digit grouping: 125000 -> ₹1,25,000.00"""
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


def leader(c, x0, x1, y, color, pitch=5.5, r=1.0):
    c.setFillColor(color)
    x = x0
    while x <= x1:
        c.circle(x, H - y, r, fill=1, stroke=0)
        x += pitch


# ---------- page parts ----------
def first_page_header(c):
    bV = M + 0.70 * WORD_V
    text(c, M - 1.5, bV, NAME_1, "PB", WORD_V, INK, hs=68)
    bE = bV + 10 + 0.70 * WORD_E
    text(c, M - 0.5, bE, NAME_2, "PB", WORD_E, INK, hs=80, cs=0.9, outline=INK, lw=0.8)
    y = bE + 28
    for line in BUSINESS_LINES:
        text(c, M, y, line, "P", BODY, GRAY)
        y += 15

    cw_, ch_, n = 148, 52, 8                       # date chip, notched corners
    cx = W - M - cw_
    poly(c, [(cx + n, M), (W - M, M), (W - M, M + ch_ - n), (W - M - n, M + ch_), (cx, M + ch_), (cx, M + n)], BLUE)
    label(c, cx + 16, M + 21, "DATE", white)
    text(c, cx + 16, M + 40, DATE, "PM", DATE_V, white)

    ry = 232                                        # recipient
    label(c, M, ry, "BILLED TO", BLUE)
    name = BILL_TO.upper()
    sR = min(REC, fit(name, "PB", 330, 84))
    text(c, M - 0.5, ry + 14 + 0.70 * sR, name, "PB", sR, INK, hs=84)


def table_header(c, ty):
    hline(c, ty, INK, 2)
    label(c, M, ty + 21, "NO.", BLUE)
    label(c, M + 64, ty + 21, "ITEM", BLUE)
    label(c, W - M, ty + 21, "PRICE", BLUE, anchor="r")
    y = ty + 34
    hline(c, y, RULE)
    return y


def footer(c):
    hline(c, H - 66, RULE)
    text(c, M, H - 42, FOOTER, "P", 9, GRAY)


def build():
    c = canvas.Canvas(OUT, pagesize=A4)
    c.setTitle(f"Invoice - {BILL_TO}")
    c.setAuthor("Viva Electronics")
    first_page_header(c)
    y = table_header(c, 312)

    for i, (item, price) in enumerate(ITEMS, 1):
        pw = tw(money(price), "PM", ROW)
        lines = wrap(item, "PM", ROW, (W - M) - pw - 28 - (M + 64))
        n = len(lines)
        rh = max(ROW_H, 40 + LEAD * (n - 1))
        if y + rh > LIMIT:                          # continue on a new page
            hline(c, y, INK, 2)
            footer(c)
            c.showPage()
            text(c, M - 0.5, M + 14, f"{NAME_1} {NAME_2}", "PB", 15, INK, hs=76)
            y = table_header(c, M + 36)
        mid = y + rh / 2
        text(c, M - 1, mid + 12, f"{i:02d}", "PB", 30, INK, hs=70, outline=INK, lw=0.9)
        fb = mid + 5 - LEAD * (n - 1) / 2
        for k, ln in enumerate(lines):
            text(c, M + 64, fb + LEAD * k, ln, "PM", ROW, INK)
        text(c, W - M, mid + 5, money(price), "PM", ROW, INK, anchor="r")
        y += rh
        last = i == len(ITEMS)
        hline(c, y, INK if last else RULE, 2 if last else 0.8)

    # total row: tag on the baseline, dotted leader, amount aligned with the PRICE column
    amt = money(sum(p for _, p in ITEMS))
    base = y + 30 + 0.70 * TOTAL
    aw = tw(amt, "PB", TOTAL, 88)
    cwid, chei = 74, 22
    cy0 = base - chei
    poly(c, [(M + 6, cy0), (M + cwid, cy0), (M + cwid, base - 6), (M + cwid - 6, base),
             (M, base), (M, cy0 + 6)], INK)
    label(c, M + 11, cy0 + 15, "TOTAL", white)
    leader(c, M + cwid + 12, (W - M) - aw - 14, base - chei / 2, BLUE)
    text(c, W - M, base, amt, "PB", TOTAL, BLUE, anchor="r", hs=88)

    footer(c)
    c.showPage()
    c.save()
    print("saved", OUT)


build()

