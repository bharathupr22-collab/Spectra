"""Link extraction (NLP tokenizer + classifier) and async link checking."""

import asyncio
import json
import re
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse

import httpx

from app.utils.ssrf import validate_url_host, SSRFError, DNSResolutionError


# ---------------------------------------------------------------------------
# Broad Known TLD set (150+ common & ccTLD entries)
# ---------------------------------------------------------------------------
KNOWN_TLDS: set[str] = {
    # Generic & Infrastructure
    "com", "org", "net", "edu", "gov", "mil", "int", "arpa",
    # Modern & Tech gTLDs
    "io", "co", "me", "app", "dev", "page", "blog", "shop", "store",
    "online", "site", "tech", "xyz", "club", "life", "info", "biz",
    "pro", "name", "museum", "travel", "aero", "coop", "mobi", "tel",
    "asia", "cat", "jobs", "post", "space", "live", "world", "cloud",
    "digital", "link", "media", "news", "today", "zone", "agency",
    # Americas
    "us", "ca", "mx", "br", "ar", "cl", "pe", "ve", "ec", "co",
    # Europe
    "uk", "de", "fr", "es", "it", "nl", "be", "at", "ch", "se", "no",
    "dk", "fi", "pl", "cz", "sk", "hu", "ro", "bg", "hr", "rs", "si",
    "lt", "lv", "ee", "pt", "ie", "gr", "tr", "is", "lu", "mt", "cy",
    "al", "mk", "ba", "md", "eu",
    # CIS / Central Asia / Eastern Europe
    "ru", "ua", "by", "kz", "ge", "am", "az",
    # Middle East & Africa
    "il", "ae", "sa", "qa", "om", "bh", "kw", "ly", "za", "ng", "ke",
    "gh", "eg", "ma", "tn",
    # Asia-Pacific
    "jp", "cn", "kr", "tw", "hk", "sg", "my", "th", "ph", "id", "vn",
    "in", "pk", "bd", "lk", "np", "au", "nz",
    # Popular Vanity / Shortener ccTLDs
    "to", "tv", "cc", "ws", "fm", "ai", "gg", "je", "im", "sh", "ac",
    "tf", "ly", "gl",
}

# Punctuation to strip from ends of candidate tokens
_STRIP_CHARS = set(",;:!?'\"<>[]{}|\\^`*~«»“”‘’")


def _strip_wrapping(token: str) -> str:
    """Strip leading/trailing punctuation while preserving balanced parens (Wikipedia URLs)."""
    # Strip whitespace
    token = token.strip()
    if not token:
        return ""

    # Always strip leading punctuation, including leading parens/brackets
    while token and (token[0] in _STRIP_CHARS or token[0] in "([<{\""):
        token = token[1:]

    # Strip trailing punctuation except parens for now
    while token and token[-1] in _STRIP_CHARS:
        token = token[:-1]

    # Strip trailing periods (sentences ending with URL, e.g. "visit example.com.")
    while token.endswith("."):
        token = token[:-1]

    # Handle trailing parentheses:
    # If the token has more closing parens than opening parens, strip the excess from the end.
    # This preserves balanced internal parens like ".../Python_(programming_language)"
    while token.endswith(")") and token.count(")") > token.count("("):
        token = token[:-1]

    # Handle trailing brackets similarly
    while token.endswith("]") and token.count("]") > token.count("["):
        token = token[:-1]

    # Strip again any trailing punctuation exposed after parenthesis stripping
    while token and (token[-1] in _STRIP_CHARS or token.endswith(".")):
        token = token[:-1]

    return token.strip()


def _is_email(token: str) -> bool:
    """Check if token is an email address."""
    if "@" not in token:
        return False
    parts = token.split("@")
    if len(parts) != 2:
        return False
    local, domain = parts
    return bool(local) and "." in domain and not local.startswith("http")


def extract_urls(text: str) -> list[str]:
    """Extract and deduplicate URLs from text using NLP tokenizer + classifier.

    Rules:
    1. Split on whitespace
    2. Strip wrapping punctuation while preserving balanced parentheses
    3. Skip @mentions, #hashtags, and email addresses
    4. Detect URLs with scheme (http://, https://, ftp://)
    5. Detect URLs with www prefix
    6. Detect bare URLs matching known broad TLD set (100+ TLDs)
    7. Prepend https:// to bare/www URLs
    8. Lowercase scheme + host to deduplicate
    """
    if not text:
        return []

    tokens = text.split()
    urls: list[str] = []
    seen: set[str] = set()

    for raw_token in tokens:
        token = _strip_wrapping(raw_token)
        if not token:
            continue

        # Skip @mentions
        if token.startswith("@"):
            continue

        # Skip #hashtags
        if token.startswith("#"):
            continue

        # Skip email addresses
        if _is_email(token):
            continue

        url: Optional[str] = None

        # Check scheme URLs
        if re.match(r"^(https?|ftp)://", token, re.IGNORECASE):
            url = token
        # Check www prefix
        elif token.lower().startswith("www."):
            url = "https://" + token
        # Check bare domains with known TLDs
        elif "." in token:
            # Extract host part before any path, query, or port
            host_candidate = token.split("/")[0].split("?")[0].split("#")[0].split(":")[0]
            # Must look like a valid domain: parts separated by dots
            domain_parts = host_candidate.split(".")
            if len(domain_parts) >= 2:
                tld = domain_parts[-1].lower()
                # TLD must be alphabetic and in known TLDs
                # Second-to-last part must not be empty and must contain alphanumeric chars
                if tld in KNOWN_TLDS and tld.isalpha() and all(p for p in domain_parts):
                    url = "https://" + token

        if url is not None:
            # Validate URL parseable
            try:
                parsed = urlparse(url)
                if parsed.netloc or (parsed.path and not url.startswith("http")):
                    hostname = parsed.hostname or parsed.netloc or token.split("/")[0]
                    # Hostname must have at least one dot
                    if "." in hostname:
                        # Normalize: lowercase scheme and host
                        scheme = (parsed.scheme or "https").lower()
                        netloc = (parsed.netloc or hostname).lower()
                        path = parsed.path
                        if parsed.query:
                            path += f"?{parsed.query}"
                        if parsed.fragment:
                            path += f"#{parsed.fragment}"
                        
                        normalized_key = f"{scheme}://{netloc}{path}"
                        
                        if normalized_key not in seen:
                            seen.add(normalized_key)
                            urls.append(url)
            except Exception:
                pass

    return urls


# ---------------------------------------------------------------------------
# Link checking
# ---------------------------------------------------------------------------

@dataclass
class LinkCheckOutput:
    """Result of checking a single URL."""
    url: str
    status_code: Optional[int] = None
    result: str = "unverified"  # working / broken / unverified / suspicious
    redirect_chain: list[str] = field(default_factory=list)
    response_time_ms: Optional[float] = None
    error: Optional[str] = None


async def check_link(url: str) -> LinkCheckOutput:
    """Check a single URL for reachability with SSRF protection.

    Result rules:
    - 2xx-3xx after redirects = working
    - 404 / 410 = broken
    - DNS failure = broken
    - 401 / 403 / 405 / 429 = unverified
    - 5xx = unverified
    - Timeout / connection error = unverified
    - SSRF blocked = suspicious
    """
    output = LinkCheckOutput(url=url)

    # 1. Parse hostname and validate for SSRF / DNS
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname
        if not hostname:
            output.result = "broken"
            output.error = "Invalid URL: no hostname"
            return output

        validate_url_host(hostname)
    except SSRFError as e:
        output.result = "suspicious"
        output.error = f"SSRF blocked: {e}"
        return output
    except DNSResolutionError as e:
        # DNS failure = broken as required!
        output.result = "broken"
        output.error = str(e)
        return output
    except Exception as e:
        output.result = "broken"
        output.error = f"Host validation error: {e}"
        return output

    # 2. Try HEAD first, follow redirects, fall back to GET on 405
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=5,
            timeout=10.0,
            headers={"User-Agent": "Spectra-Bot/1.0 (+https://spectra.example.com)"},
        ) as client:
            resp = await client.head(url)

            if resp.status_code == 405:
                resp = await client.get(url)

            elapsed_ms = (time.monotonic() - start) * 1000
            output.status_code = resp.status_code
            output.response_time_ms = round(elapsed_ms, 2)
            output.redirect_chain = [str(r.url) for r in resp.history]

            code = resp.status_code
            if 200 <= code <= 399:
                output.result = "working"
            elif code in (404, 410):
                output.result = "broken"
            elif code in (401, 403, 405, 429):
                output.result = "unverified"
            elif 500 <= code <= 599:
                output.result = "unverified"
            else:
                output.result = "unverified"

    except httpx.TimeoutException:
        output.result = "unverified"
        output.error = "Request timed out"
    except httpx.ConnectError as e:
        err_str = str(e).lower()
        if any(term in err_str for term in ("dns", "getaddrinfo", "name resolution", "nodename")):
            output.result = "broken"
            output.error = f"DNS resolution failed: {e}"
        else:
            output.result = "unverified"
            output.error = "Connection error"
    except Exception as e:
        err_str = str(e).lower()
        if any(term in err_str for term in ("dns", "getaddrinfo", "name resolution", "nodename")):
            output.result = "broken"
            output.error = f"DNS resolution failed: {e}"
        else:
            output.result = "unverified"
            output.error = str(e)

    return output


async def check_links_batch(urls: list[str]) -> list[LinkCheckOutput]:
    """Check multiple URLs concurrently."""
    tasks = [check_link(url) for url in urls]
    return await asyncio.gather(*tasks)
