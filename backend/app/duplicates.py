"""Finding contacts that are probably the same person (PLAN.md §14)."""

import re
from collections import defaultdict

from app.models import Contact

LAOS = "856"


def phone_key(phone: str | None) -> str | None:
    """ "+856 20 5555 1234", "020 5555 1234" and "8562055551234" are the same number.
    Same rules as the WhatsApp button (frontend/src/lib/phone.ts)."""
    text = (phone or "").strip()
    digits = re.sub(r"\D", "", text)
    if not digits:
        return None
    if text.startswith("+"):
        pass
    elif digits.startswith("00"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = LAOS + digits[1:]
    elif not digits.startswith(LAOS):
        digits = LAOS + digits
    return digits if 9 <= len(digits) <= 15 else None


def name_key(contact: Contact) -> str | None:
    """Full names only: a first name alone ("Noy") is shared by too many different people."""
    if not contact.last_name:
        return None
    return " ".join(f"{contact.first_name} {contact.last_name}".casefold().split())


def find_groups(contacts: list[Contact]) -> list[tuple[list[str], list[Contact]]]:
    """Groups of 2+ contacts linked by the same phone, email or full name (transitively), each
    with the reasons that linked them. Oldest contact first in each group; groups by size."""
    parent = {c.id: c.id for c in contacts}

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    reasons_by_root: dict[int, set[str]] = defaultdict(set)
    links: list[tuple[str, list[int]]] = []
    for reason, key in (
        ("phone", lambda c: phone_key(c.phone)),
        ("email", lambda c: c.email.casefold() if c.email else None),
        ("name", name_key),
    ):
        buckets: dict[str, list[int]] = defaultdict(list)
        for contact in contacts:
            value = key(contact)
            if value:
                buckets[value].append(contact.id)
        for ids in buckets.values():
            if len(ids) > 1:
                links.append((reason, ids))
                for other in ids[1:]:
                    parent[find(other)] = find(ids[0])
    for reason, ids in links:
        reasons_by_root[find(ids[0])].add(reason)

    members: dict[int, list[Contact]] = defaultdict(list)
    for contact in contacts:
        members[find(contact.id)].append(contact)
    groups = [
        (sorted(reasons_by_root[root]), sorted(group, key=lambda c: (c.created_at, c.id)))
        for root, group in members.items()
        if len(group) > 1
    ]
    return sorted(groups, key=lambda g: (-len(g[1]), g[1][0].id))
