"""Generate the 9 matrix fixtures and stress fixtures for S01 golden tests."""
from __future__ import annotations

import json
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent

COL_CONFIG_1 = [
    {"id": "no", "label": "NO.", "kind": "integer", "align": "left"},
    {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
    {"id": "rate", "label": "RATE", "kind": "number", "align": "right"},
]

COL_CONFIG_2 = [
    {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
    {"id": "rate", "label": "RATE", "kind": "number", "align": "right"},
]

COL_CONFIG_3 = [
    {"id": "no", "label": "NO.", "kind": "integer", "align": "left"},
    {"id": "item", "label": "ITEM", "kind": "text", "align": "left"},
    {"id": "qty", "label": "QTY", "kind": "number", "align": "right"},
    {"id": "rate", "label": "RATE", "kind": "number", "align": "right"},
    {"id": "amount", "label": "AMOUNT", "kind": "number", "align": "right"},
]


def make_rows(columns: list[dict], count: int) -> list[dict]:
    rows = []
    has_no = any(c["id"] == "no" for c in columns)
    has_qty = any(c["id"] == "qty" for c in columns)
    has_amount = any(c["id"] == "amount" for c in columns)

    for i in range(1, count + 1):
        row = {}
        if has_no:
            row["no"] = f"{i:02d}"
        row["item"] = f"Standard Servicing Package #{i}"
        row["rate"] = f"₹{i * 150}.00"
        if has_qty:
            row["qty"] = "1"
        if has_amount:
            row["amount"] = f"₹{i * 150}.00"
        rows.append(row)
    return rows


def generate() -> None:
    setups = [
        ("no_item_rate", COL_CONFIG_1),
        ("item_rate", COL_CONFIG_2),
        ("full", COL_CONFIG_3),
    ]
    counts = [1, 8, 40]

    for name, cols in setups:
        for count in counts:
            filename = f"matrix_{name}_{count}.json"
            rows = make_rows(cols, count)
            # Calculate total
            total_val = sum(i * 150 for i in range(1, count + 1))
            total_str = f"₹{total_val:,}.00"
            # Format Indian digit grouping
            # (total_val is <= 123000, standard formatting or exact)
            data = {
                "business": {
                    "name": "VIVA ELECTRONICS",
                    "lines": [
                        "Chettiyamkinar, Kottakkal, Malappuram, Kerala",
                        "9995880059  ·  9633334786",
                    ],
                    "phones": [],
                },
                "date_display": "10 November 2026",
                "billed_to": "Illikkal Auditorium",
                "labels": {
                    "billed_to": "BILLED TO",
                    "date": "DATE",
                    "total": "TOTAL",
                },
                "columns": cols,
                "rows": rows,
                "total_display": total_str,
                "footer": "Thank you for your business.",
                "currency": "₹",
            }
            (FIXTURES_DIR / filename).write_text(json.dumps(data, indent=2))

    # Stress 1: Long business name
    data_long_biz = {
        "business": {
            "name": "VIVA ELECTRONICS AND SOUND REINFORCEMENT AUDITORIUM ENGINEERING SERVICES PRIVATE LIMITED",
            "lines": ["Kerala, India"],
            "phones": [],
        },
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": COL_CONFIG_1,
        "rows": make_rows(COL_CONFIG_1, 2),
        "total_display": "₹450.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    (FIXTURES_DIR / "stress_long_business_name.json").write_text(json.dumps(data_long_biz, indent=2))

    # Stress 2: Long item wrapping
    rows_long_item = [
        {
            "no": "01",
            "item": "Dual 18-inch Subwoofer Enclosure Low-Frequency Transducer Reconing, Alignment, and Voice Coil Rewinding with High-Temperature Kapton Former",
            "rate": "₹8,500.00",
        }
    ]
    data_long_item = {
        "business": {"name": "VIVA ELECTRONICS", "lines": [], "phones": []},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": COL_CONFIG_1,
        "rows": rows_long_item,
        "total_display": "₹8,500.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    (FIXTURES_DIR / "stress_long_item.json").write_text(json.dumps(data_long_item, indent=2))

    # Stress 3: Long recipient (billed_to up to 80 chars)
    data_long_recipient = {
        "business": {"name": "VIVA ELECTRONICS", "lines": [], "phones": []},
        "date_display": "10 November 2026",
        "billed_to": "Kottakkal Arya Vaidya Sala Charitable Hospital & Research Centre Auditorium Main",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": COL_CONFIG_1,
        "rows": make_rows(COL_CONFIG_1, 1),
        "total_display": "₹150.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    (FIXTURES_DIR / "stress_long_recipient.json").write_text(json.dumps(data_long_recipient, indent=2))

    # Stress 4: Large amount (1,23,45,678.50)
    data_large_amount = {
        "business": {"name": "VIVA ELECTRONICS", "lines": [], "phones": []},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": COL_CONFIG_1,
        "rows": [{"no": "01", "item": "Stadium Concert Line Array Rig", "rate": "₹1,23,45,678.50"}],
        "total_display": "₹1,23,45,678.50",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    (FIXTURES_DIR / "stress_large_amount.json").write_text(json.dumps(data_large_amount, indent=2))

    # Stress 5: Decimal qty
    data_decimal_qty = {
        "business": {"name": "VIVA ELECTRONICS", "lines": [], "phones": []},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": COL_CONFIG_3,
        "rows": [{"no": "01", "item": "Copper Speaker Cable (Meters)", "qty": "2.500", "rate": "₹120.00", "amount": "₹300.00"}],
        "total_display": "₹300.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    (FIXTURES_DIR / "stress_decimal_qty.json").write_text(json.dumps(data_decimal_qty, indent=2))

    # Stress 6: Orphan total trigger
    # Row count where page 1 rows end right near bottom margin, testing carry over of last row
    data_orphan = {
        "business": {"name": "VIVA ELECTRONICS", "lines": ["Kerala"], "phones": []},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": COL_CONFIG_1,
        "rows": make_rows(COL_CONFIG_1, 14),
        "total_display": "₹15,750.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    (FIXTURES_DIR / "stress_orphan_total.json").write_text(json.dumps(data_orphan, indent=2))

    # Stress 7: 200 rows limit test
    data_limit_200 = {
        "business": {"name": "VIVA ELECTRONICS", "lines": [], "phones": []},
        "date_display": "10 November 2026",
        "billed_to": "Illikkal Auditorium",
        "labels": {"billed_to": "BILLED TO", "date": "DATE", "total": "TOTAL"},
        "columns": COL_CONFIG_1,
        "rows": make_rows(COL_CONFIG_1, 200),
        "total_display": "₹3,015,000.00",
        "footer": "Thank you for your business.",
        "currency": "₹",
    }
    (FIXTURES_DIR / "stress_limit_200_rows.json").write_text(json.dumps(data_limit_200, indent=2))


if __name__ == "__main__":
    generate()
    print("Fixtures generated successfully.")
