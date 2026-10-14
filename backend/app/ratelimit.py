"""Slow down password guessing: after too many failed sign-ins, refuse further attempts
for a while — per account+address (MAX_FAILURES) and per address across all emails
(MAX_FAILURES_PER_CLIENT, against trying many accounts).

In memory, so it is per process — fine for the single-process deployment in
docker-compose. Several workers or servers would need a shared store (e.g. Redis).
"""

from collections import defaultdict, deque
from datetime import timedelta
from threading import Lock

from app.clock import utcnow

MAX_FAILURES = 5
MAX_FAILURES_PER_CLIENT = 20
WINDOW = timedelta(minutes=15)


class LoginLimiter:
    def __init__(self, max_failures: int) -> None:
        self.max_failures = max_failures
        self._failures: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str) -> deque:
        attempts = self._failures[key]
        cutoff = utcnow() - WINDOW
        while attempts and attempts[0] < cutoff:
            attempts.popleft()
        return attempts

    def retry_after(self, key: str) -> timedelta | None:
        """How long until the next attempt is allowed, or None if allowed now."""
        with self._lock:
            attempts = self._prune(key)
            if not attempts:
                del self._failures[key]  # don't keep a key per email ever tried
                return None
            if len(attempts) < self.max_failures:
                return None
            return attempts[0] + WINDOW - utcnow()

    def failed(self, key: str) -> None:
        with self._lock:
            self._prune(key).append(utcnow())

    def succeeded(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def reset(self) -> None:
        with self._lock:
            self._failures.clear()


account_limiter = LoginLimiter(MAX_FAILURES)
client_limiter = LoginLimiter(MAX_FAILURES_PER_CLIENT)


def login_keys(email: str, client: str | None) -> tuple[str, str]:
    client = client or "?"
    return f"{email.lower()}|{client}", client
