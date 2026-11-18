
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, white

# ---------- Invoice data (edit for each new invoice) ----------
BUSINESS_NAME = "VIVA ELECTRONICS"
BUSINESS_LINES = ["Chettiyamkinar, Kottakkal, Malappuram, Kerala",
                  "9995880059  ·  9633334786"]
DATE = "10 November 2026"
BILL_TO = "Illikkal Auditorium"
ITEMS = [("Sub Amp Servicing", 900.00)]
OUT = "invoice.pdf"

# ---------- Fonts ----------
FONT_DIR = "./"  # folder containing Poppins-Regular.ttf, Poppins-Medium.ttf, Poppins-Bold.ttf
pdfmetrics.registerFont(TTFont("P", FONT_DIR + "Poppins-Regular.ttf"))
pdfmetrics.registerFont(TTFont("PM", FONT_DIR + "Poppins-Medium.ttf"))
pdfmetrics.registerFont(TTFont("PB", FONT_DIR + "Poppins-Bold.ttf"))

# ---------- One colour system: ink + neutrals ----------
INK = HexColor("#111111")      # text, table header, total bar
GRAY = HexColor("#6B6B6B")     # secondary text
SOFT = HexColor("#A3A3A3")     # secondary text on black
LINE = HexColor("#E6E6E6")     # hairlines

W, H = A4
M = 48          # page margin (8pt grid)
R = 8           # one corner radius, used everywhere


def spaced(c, x, y, text, font, size, space, align="left"):
    width = pdfmetrics.stringWidth(text, font, size) + space * len(text)
    if align == "right":
        x -= width
    t = c.beginText(x, y)
    t.setFont(font, size)
    t.setCharSpace(space)
    t.textOut(text)
    t.setCharSpace(0)
    c.drawText(t)


def money(v):
    """Rupee amount with Indian digit grouping, e.g. 125000 -> ₹1,25,000.00"""
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


c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle(f"Invoice - {BILL_TO}")
c.setAuthor("Viva Electronics")

# --- Business block, top-left ---
c.setFillColor(INK)
c.setFont("PB", 20)
c.drawString(M, H - 72, BUSINESS_NAME)
c.setFillColor(GRAY)
c.setFont("P", 9.5)
y = H - 92
for line in BUSINESS_LINES:
    c.drawString(M, y, line)
    y -= 14

# --- Date, top-right (aligned to name baseline and first detail line) ---
c.setFillColor(GRAY)
spaced(c, W - M, H - 72, "DATE", "PM", 7.5, 1.4, align="right")
c.setFillColor(INK)
c.setFont("PM", 10.5)
c.drawRightString(W - M, H - 92, DATE)

# --- Hairline divider ---
c.setStrokeColor(LINE)
c.setLineWidth(0.8)
c.line(M, H - 128, W - M, H - 128)

# --- Billed to ---
c.setFillColor(GRAY)
spaced(c, M, H - 168, "BILLED TO", "PM", 7.5, 1.4)
c.setFillColor(INK)
c.setFont("PM", 14)
c.drawString(M, H - 190, BILL_TO)

# --- Table ---
tx, tw = M, W - 2 * M
col_no, col_item, col_price = tx + 16, tx + 64, tx + tw - 16
top, hh, rh = H - 240, 32, 48

c.setFillColor(INK)
c.roundRect(tx, top - hh, tw, hh, R, fill=1, stroke=0)
c.setFillColor(white)
spaced(c, col_no, top - 20, "NO.", "PM", 7.5, 1.4)
spaced(c, col_item, top - 20, "ITEM", "PM", 7.5, 1.4)
spaced(c, col_price, top - 20, "PRICE", "PM", 7.5, 1.4, align="right")

y = top - hh
for i, (name, price) in enumerate(ITEMS, 1):
    base = y - rh / 2 - 4
    c.setFillColor(GRAY)
    c.setFont("P", 10)
    c.drawString(col_no, base, f"{i:02d}")
    c.setFillColor(INK)
    c.setFont("PM", 11)
    c.drawString(col_item, base, name)
    c.drawRightString(col_price, base, money(price))
    y -= rh
    c.setStrokeColor(LINE)
    c.setLineWidth(0.8)
    c.line(tx, y, tx + tw, y)

# --- Total: same black, same radius as the header; amount aligns with PRICE column ---
total = sum(p for _, p in ITEMS)
bw, bh = 248, 48
bx, by = tx + tw - bw, y - 24 - bh
c.setFillColor(INK)
c.roundRect(bx, by, bw, bh, R, fill=1, stroke=0)
base = by + bh / 2 - 6
c.setFillColor(SOFT)
spaced(c, bx + 20, base, "TOTAL", "PM", 7.5, 1.4)
c.setFillColor(white)
c.setFont("PB", 18)
c.drawRightString(col_price, base, money(total))

# --- Footer ---
c.setStrokeColor(LINE)
c.setLineWidth(0.8)
c.line(M, 72, W - M, 72)
c.setFillColor(GRAY)
c.setFont("P", 8.5)
c.drawCentredString(W / 2, 52, "Thank you for your business.")

c.showPage()
c.save()
print("saved", OUT)

