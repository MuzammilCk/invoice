"""Tests for text normalization and RuleBasedNormalizer (BP 3.1, 6.3)."""



def test_normalizer_casing_and_acronyms():
    from services.api.app.perception.normalizer import RuleBasedNormalizer

    norm = RuleBasedNormalizer()

    # Acronyms <= 4 letters should be uppercase
    res = norm.normalize("pvc pipe 1 inch", step_kind="item")
    assert res.value == "PVC Pipe 1 Inch"

    res = norm.normalize("led bulb 9w", step_kind="item")
    assert res.value == "LED Bulb 9W"

    res = norm.normalize("tmt steel rod", step_kind="item")
    assert res.value == "TMT Steel Rod"

    res = norm.normalize("ac outdoor unit", step_kind="item")
    assert res.value == "AC Outdoor Unit"


def test_normalizer_whitespace_and_trimming():
    from services.api.app.perception.normalizer import RuleBasedNormalizer

    norm = RuleBasedNormalizer()

    res = norm.normalize("   asha    stores   ", step_kind="recipient")
    assert res.value == "Asha Stores"


def test_normalizer_length_limits():
    from services.api.app.perception.normalizer import RuleBasedNormalizer

    norm = RuleBasedNormalizer()

    # Recipient max 80 chars
    long_rec = "a" * 100
    res = norm.normalize(long_rec, step_kind="recipient")
    assert len(res.value) <= 80

    # Item max 120 chars
    long_item = "item word " * 20
    res_item = norm.normalize(long_item, step_kind="item")
    assert len(res_item.value) <= 120


def test_normalizer_malayalam_transliteration():
    from services.api.app.perception.normalizer import RuleBasedNormalizer

    norm = RuleBasedNormalizer()

    # Common Malayalam item words mapped to Latin
    res1 = norm.normalize("സിമന്റ്", step_kind="item")
    assert "Cement" in res1.value

    res2 = norm.normalize("പൈപ്പ്", step_kind="item")
    assert "Pipe" in res2.value


def test_normalizer_no_prices_or_quantities_injected():
    from services.api.app.perception.normalizer import RuleBasedNormalizer

    norm = RuleBasedNormalizer()

    res = norm.normalize("Asian Paints", step_kind="item")
    assert "₹" not in res.value
    assert "100" not in res.value
