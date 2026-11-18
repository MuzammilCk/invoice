"""Tests for auth endpoints (AC2–AC7)."""

from app.auth import clear_all_sessions, hash_pin, rate_limiter
from app.models.workspace import Workspace


def _setup_pin(db_session, pin="1234"):
    """Set a known PIN on the workspace."""
    ws = db_session.query(Workspace).first()
    ws.pin_hash = hash_pin(pin)
    db_session.commit()
    return ws


class TestLogin:
    """AC2, AC3: Login with correct and incorrect PIN."""

    def test_login_correct_pin(self, client, db_session):
        """AC2: Correct PIN returns 200 and a session cookie."""
        clear_all_sessions()
        rate_limiter.reset(db_session.query(Workspace).first().id)
        _setup_pin(db_session)

        resp = client.post("/auth/login", json={"pin": "1234"})
        assert resp.status_code == 200
        assert resp.json()["message"] == "ok"
        assert "session" in resp.cookies

    def test_login_wrong_pin(self, client, db_session):
        """AC3: Wrong PIN returns 401 with error format."""
        clear_all_sessions()
        rate_limiter.reset(db_session.query(Workspace).first().id)
        _setup_pin(db_session)

        resp = client.post("/auth/login", json={"pin": "9999"})
        assert resp.status_code == 401
        body = resp.json()
        assert body["code"] == "INVALID_PIN"
        assert "message" in body

    def test_login_empty_pin_rejected(self, client, db_session):
        """Edge: Empty PIN returns 422."""
        resp = client.post("/auth/login", json={"pin": ""})
        assert resp.status_code == 422

    def test_login_no_pin_set(self, client, db_session):
        """Edge: Login when PIN not set returns 400."""
        clear_all_sessions()
        ws = db_session.query(Workspace).first()
        ws.pin_hash = None
        db_session.commit()
        rate_limiter.reset(ws.id)

        resp = client.post("/auth/login", json={"pin": "1234"})
        assert resp.status_code == 400
        assert resp.json()["code"] == "PIN_NOT_SET"


class TestRateLimiting:
    """AC4: 5 wrong attempts → 429 and 10 min lock."""

    def test_rate_limit_after_5_failures(self, client, db_session):
        """AC4: 6th attempt returns 429."""
        clear_all_sessions()
        ws = _setup_pin(db_session)
        rate_limiter.reset(ws.id)

        for _ in range(5):
            resp = client.post("/auth/login", json={"pin": "wrong"})
        # The 5th should trigger the lock
        assert resp.status_code == 429

        # 6th attempt is definitely locked
        resp = client.post("/auth/login", json={"pin": "wrong"})
        assert resp.status_code == 429
        assert resp.json()["code"] == "RATE_LIMITED"

    def test_correct_pin_blocked_during_lockout(self, client, db_session):
        """AC4: Even the correct PIN is rejected during lockout."""
        clear_all_sessions()
        ws = _setup_pin(db_session)
        rate_limiter.reset(ws.id)

        for _ in range(5):
            client.post("/auth/login", json={"pin": "wrong"})

        resp = client.post("/auth/login", json={"pin": "1234"})
        assert resp.status_code == 429


class TestLogout:
    """AC5: Logout clears the session."""

    def test_logout_clears_session(self, client, db_session):
        """AC5: After logout, /me returns 401."""
        clear_all_sessions()
        rate_limiter.reset(db_session.query(Workspace).first().id)
        _setup_pin(db_session)

        # Login
        login_resp = client.post("/auth/login", json={"pin": "1234"})
        assert login_resp.status_code == 200

        # /me works
        me_resp = client.get("/auth/me")
        assert me_resp.status_code == 200

        # Logout
        logout_resp = client.post("/auth/logout")
        assert logout_resp.status_code == 200

        # /me fails
        me_resp2 = client.get("/auth/me")
        assert me_resp2.status_code == 401


class TestMe:
    """AC6, AC7: Session check."""

    def test_me_with_valid_session(self, client, db_session):
        """AC6: /me with valid session returns workspace info."""
        clear_all_sessions()
        rate_limiter.reset(db_session.query(Workspace).first().id)
        _setup_pin(db_session)

        client.post("/auth/login", json={"pin": "1234"})
        resp = client.get("/auth/me")
        assert resp.status_code == 200
        body = resp.json()
        assert "workspace_id" in body
        assert "name" in body

    def test_me_without_session(self, client):
        """AC7: /me without session returns 401."""
        clear_all_sessions()
        resp = client.get("/auth/me")
        assert resp.status_code == 401


class TestSetup:
    """Setup endpoint for initial PIN."""

    def test_setup_sets_pin_and_logs_in(self, client, db_session):
        """Setup sets the PIN and returns a session cookie."""
        clear_all_sessions()
        ws = db_session.query(Workspace).first()
        ws.pin_hash = None
        db_session.commit()

        resp = client.post("/auth/setup", json={"pin": "1234", "name": "Test Biz"})
        assert resp.status_code == 200
        assert "session" in resp.cookies

        # /me works now
        me_resp = client.get("/auth/me")
        assert me_resp.status_code == 200
        assert me_resp.json()["name"] == "Test Biz"

    def test_setup_rejects_if_pin_already_set(self, client, db_session):
        """Setup fails if PIN is already set."""
        clear_all_sessions()
        _setup_pin(db_session)

        resp = client.post("/auth/setup", json={"pin": "5678"})
        assert resp.status_code == 400
        assert resp.json()["code"] == "PIN_ALREADY_SET"
