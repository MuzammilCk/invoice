"""T7 tests: Performance benchmark validating p95 latency under 500 ms.

Run:
    pytest renderer/tests/test_perf.py -v
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from contracts.render_model import RenderModel
from renderer import render

FIXTURES_DIR = Path(__file__).parent.parent / "fixtures"


def test_render_p95_latency_under_500ms() -> None:
    fixture_path = FIXTURES_DIR / "matrix_full_8.json"
    data = json.loads(fixture_path.read_text())
    model = RenderModel.model_validate(data)

    # Warmup
    for _ in range(5):
        render(model)

    # 50 measured iterations
    iterations = 50
    durations: list[float] = []

    for _ in range(iterations):
        t0 = time.perf_counter()
        render(model)
        t1 = time.perf_counter()
        durations.append(t1 - t0)

    durations.sort()
    # 95th percentile index: int(0.95 * 50) = 47
    p95_index = int(0.95 * iterations)
    p95_duration = durations[p95_index]
    p95_ms = p95_duration * 1000

    print("\n[Performance Benchmark] 50 runs of 8-row invoice:")
    print(f"  Min: {min(durations)*1000:.2f} ms")
    print(f"  Median: {durations[len(durations)//2]*1000:.2f} ms")
    print(f"  p95: {p95_ms:.2f} ms")
    print(f"  Max: {max(durations)*1000:.2f} ms")

    # Budget from BP 7.8 and BP 15: p95 under 500 ms
    assert p95_duration < 0.500, f"p95 latency {p95_ms:.2f} ms exceeded 500 ms budget!"
