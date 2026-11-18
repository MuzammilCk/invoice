"""Auth service: PIN hashing, session management, rate limiting (BP 8.4, 8.2)."""

from __future__ import annotations

import datetime
import hashlib
import secrets
import time
from dataclasses import dataclass, field

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

ph = PasswordHasher()


def hash_pin(pin: str) -> str:
    """Hash a PIN with argon2id."""
    return ph.hash(pin)


def verify_pin(pin_hash: str, pin: str) -> bool:
    """Verify a PIN against its argon2id hash."""
    try:
        return ph.verify(pin_hash, pin)
    except VerifyMismatchError:
        return False


def create_session_token() -> str:
    """Generate a cryptographically secure session token."""
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    """Hash a session token for storage (SHA-256, not password-grade — tokens are high-entropy)."""
    return hashlib.sha256(token.encode()).hexdigest()


@dataclass
class _Attempt:
    count: int = 0
    locked_until: float = 0.0


@dataclass
class RateLimiter:
    """Track failed login attempts per workspace (BP 8.2: 5 fails → 10 min lock)."""

    max_attempts: int = 5
    lockout_seconds: int = 600  # 10 minutes
    _attempts: dict[str, _Attempt] = field(default_factory=dict)

    def is_locked(self, workspace_id: str) -> bool:
        attempt = self._attempts.get(workspace_id)
        if attempt is None:
            return False
        if attempt.locked_until > time.monotonic():
            return True
        # Lock expired — reset
        if attempt.count >= self.max_attempts:
            attempt.count = 0
            attempt.locked_until = 0.0
        return False

    def record_failure(self, workspace_id: str) -> bool:
        """Record a failed attempt. Returns True if now locked."""
        attempt = self._attempts.setdefault(workspace_id, _Attempt())
        attempt.count += 1
        if attempt.count >= self.max_attempts:
            attempt.locked_until = time.monotonic() + self.lockout_seconds
            return True
        return False

    def reset(self, workspace_id: str) -> None:
        """Reset attempts after a successful login."""
        self._attempts.pop(workspace_id, None)

    def remaining_lockout(self, workspace_id: str) -> int:
        """Return seconds remaining in lockout, or 0."""
        attempt = self._attempts.get(workspace_id)
        if attempt is None:
            return 0
        remaining = attempt.locked_until - time.monotonic()
        return max(0, int(remaining))


# Module-level singletons
rate_limiter = RateLimiter()

# In-memory session store: token_hash → (workspace_id, expires_at)
_sessions: dict[str, tuple[str, datetime.datetime]] = {}


def store_session(
    token: str, workspace_id: str, max_age_seconds: int
) -> None:
    """Store a session token."""
    token_hash = hash_session_token(token)
    expires_at = datetime.datetime.now(datetime.UTC) + datetime.timedelta(seconds=max_age_seconds)
    _sessions[token_hash] = (workspace_id, expires_at)


def validate_session(token: str) -> str | None:
    """Validate a session token. Returns workspace_id or None."""
    token_hash = hash_session_token(token)
    entry = _sessions.get(token_hash)
    if entry is None:
        return None
    workspace_id, expires_at = entry
    if datetime.datetime.now(datetime.UTC) > expires_at:
        _sessions.pop(token_hash, None)
        return None
    return workspace_id


def delete_session(token: str) -> None:
    """Delete a session token."""
    token_hash = hash_session_token(token)
    _sessions.pop(token_hash, None)


def clear_all_sessions() -> None:
    """Clear all sessions (for testing)."""
    _sessions.clear()
