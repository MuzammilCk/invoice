"""Tests for demo script and 30-phrase verification runner (BP 15)."""


def test_run_demo():
    from services.api.app.perception.demo import run_demo

    total, passed, failed = run_demo(verbose=False)
    assert total == 30
    assert passed == 30
    assert failed == 0
