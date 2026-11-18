"""SSRF protection — block requests to private/internal IP ranges."""

import ipaddress
import socket
from typing import Optional


# Private and internal IP networks to block
BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),       # Loopback
    ipaddress.ip_network("10.0.0.0/8"),         # Private Class A
    ipaddress.ip_network("172.16.0.0/12"),      # Private Class B
    ipaddress.ip_network("192.168.0.0/16"),     # Private Class C
    ipaddress.ip_network("169.254.0.0/16"),     # Link-local
    ipaddress.ip_network("::1/128"),            # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),           # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),          # IPv6 link-local
]

# Single addresses to block
BLOCKED_ADDRESSES = [
    ipaddress.ip_address("0.0.0.0"),
]


class SSRFError(Exception):
    """Raised when a URL resolves to a blocked (private/internal) IP."""
    pass


class DNSResolutionError(Exception):
    """Raised when DNS resolution fails for a host."""
    pass


def is_ip_blocked(ip_str: str) -> bool:
    """Check whether an IP address falls within a blocked range."""
    try:
        addr = ipaddress.ip_address(ip_str)
    except ValueError:
        return True  # unparseable → block

    if addr in BLOCKED_ADDRESSES:
        return True

    for network in BLOCKED_NETWORKS:
        if addr in network:
            return True

    return False


def validate_url_host(hostname: str) -> Optional[str]:
    """Resolve *hostname* and verify none of its IPs are private.

    Returns the first resolved IP if safe, raises DNSResolutionError if host cannot be resolved,
    or SSRFError if resolved IP is private/internal.
    """
    # 1. Fast path: check if hostname is an IP literal
    try:
        ip = ipaddress.ip_address(hostname)
        if is_ip_blocked(str(ip)):
            raise SSRFError(f"Blocked private/internal IP {ip} for host {hostname}")
        return str(ip)
    except ValueError:
        pass

    # 2. Hostname resolution
    try:
        results = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise DNSResolutionError(f"DNS resolution failed for {hostname}: {e}")

    if not results:
        raise DNSResolutionError(f"No DNS results for {hostname}")

    for family, _type, _proto, _canonname, sockaddr in results:
        ip_str = sockaddr[0]
        if is_ip_blocked(ip_str):
            raise SSRFError(f"Blocked private/internal IP {ip_str} for host {hostname}")

    return results[0][4][0]
