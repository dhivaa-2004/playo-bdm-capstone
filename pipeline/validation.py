"""Validate source provenance and normalize imported venue observations."""
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from hashlib import sha256
from urllib.parse import urlsplit
import json
import unicodedata


class InvalidRecord(ValueError):
    pass


def text(value, field, required=False):
    if value is None and not required:
        return None
    if not isinstance(value, str):
        raise InvalidRecord(f"{field}: expected text")
    cleaned = " ".join(unicodedata.normalize("NFKC", value).split())
    if required and not cleaned:
        raise InvalidRecord(f"{field}: required")
    return cleaned or None


def number(value, field, maximum=None, integer=False):
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        raise InvalidRecord(f"{field}: boolean is not a number")
    try:
        n = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise InvalidRecord(f"{field}: invalid number") from None
    if not n.is_finite() or n < 0 or (maximum is not None and n > maximum):
        raise InvalidRecord(f"{field}: outside permitted range")
    if integer and n != n.to_integral_value():
        raise InvalidRecord(f"{field}: expected whole number")
    return int(n) if integer else float(n)


def normalize(record):
    if not isinstance(record, dict):
        raise InvalidRecord("record: expected object")
    source_type = record.get("source_type")
    if source_type not in {"playo_public", "synthetic", "licensed_other"}:
        raise InvalidRecord("source_type: explicit valid provenance required")
    source_id = text(record.get("source_id"), "source_id", True)
    observed_at = record.get("observed_at")
    try:
        timestamp = datetime.fromisoformat(observed_at.replace("Z", "+00:00"))
        if timestamp.utcoffset() is None:
            raise ValueError()
    except (AttributeError, TypeError, ValueError):
        raise InvalidRecord("observed_at: timezone-aware ISO timestamp required") from None
    source_url = record.get("source_url")
    if source_type != "synthetic":
        if not isinstance(source_url, str):
            raise InvalidRecord("source_url: required for source-derived records")
        try:
            url = urlsplit(source_url)
            valid_url = url.scheme == "https" and bool(url.hostname) and not url.username and not url.password
            if source_type == "playo_public":
                valid_url = valid_url and (url.hostname == "playo.co" or url.hostname.endswith(".playo.co"))
        except (ValueError, AttributeError):
            valid_url = False
        if not valid_url:
            raise InvalidRecord("source_url: invalid source origin")
        text(record.get("permission_reference"), "permission_reference", True)
        # A reference supports traceability, not automatic legal verification.
    elif source_url is not None:
        raise InvalidRecord("source_url: synthetic records must not impersonate a real source")
    venue = record.get("venue")
    if not isinstance(venue, dict):
        raise InvalidRecord("venue: expected object")
    sports = venue.get("sports", [])
    if not isinstance(sports, list):
        raise InvalidRecord("sports: expected list")
    sports = sorted({text(s, "sport", True).casefold() for s in sports})
    identity = json.dumps([source_type, source_id], separators=(",", ":"))
    return {
        "entity_id": sha256(identity.encode()).hexdigest(),
        "source_id": source_id,
        "source_type": source_type,
        "is_synthetic": source_type == "synthetic",
        "source_url": source_url,
        "observed_at": timestamp.astimezone(timezone.utc).isoformat(),
        "permission_reference": record.get("permission_reference"),
        "name": text(venue.get("name"), "name", True),
        "city": text(venue.get("city"), "city", True),
        "address": text(venue.get("address"), "address"),
        "description": text(venue.get("description"), "description"),
        "rating": number(venue.get("rating"), "rating", maximum=5),
        "rating_count": number(venue.get("rating_count"), "rating_count", integer=True),
        "sports": sports,
    }
