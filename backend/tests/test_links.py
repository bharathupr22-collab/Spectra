"""Tests for link checker: NLP tokenizer + classifier accuracy, SSRF, and endpoints."""

import json
from pathlib import Path

import pytest

from app.services.link_checker import extract_urls, check_link, KNOWN_TLDS
from app.utils.ssrf import is_ip_blocked, validate_url_host, SSRFError, DNSResolutionError


def test_known_tlds_count():
    """Verify broad TLD coverage (at least 100 TLDs required)."""
    assert len(KNOWN_TLDS) >= 100
    assert "com" in KNOWN_TLDS
    assert "in" in KNOWN_TLDS
    assert "ee" in KNOWN_TLDS
    assert "be" in KNOWN_TLDS
    assert "io" in KNOWN_TLDS
    assert "org" in KNOWN_TLDS


def test_link_extractor_precision_and_recall():
    """Test extractor on labelled test set — must achieve at least 95% precision and recall."""
    test_set_path = Path(__file__).parent / "test_data" / "link_test_set.json"
    with open(test_set_path, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    true_positives = 0
    false_positives = 0
    false_negatives = 0

    for case in test_cases:
        text = case["input"]
        expected = set(u.lower() for u in case["expected_urls"])
        predicted = set(u.lower() for u in extract_urls(text))

        tp = len(expected & predicted)
        fp = len(predicted - expected)
        fn = len(expected - predicted)

        true_positives += tp
        false_positives += fp
        false_negatives += fn

    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 1.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 1.0

    print(f"\nLink Extractor Evaluation: Precision = {precision:.4f}, Recall = {recall:.4f}")
    print(f"TP: {true_positives}, FP: {false_positives}, FN: {false_negatives}")

    # Accuracy bar: >= 95% precision and recall
    assert precision >= 0.95, f"Precision {precision:.4f} below 95% threshold"
    assert recall >= 0.95, f"Recall {recall:.4f} below 95% threshold"


def test_ssrf_ip_blocking():
    """Test that private and internal IP ranges are blocked."""
    # Loopback
    assert is_ip_blocked("127.0.0.1") is True
    assert is_ip_blocked("127.255.255.255") is True
    # Private Class A
    assert is_ip_blocked("10.0.0.1") is True
    assert is_ip_blocked("10.255.255.255") is True
    # Private Class B
    assert is_ip_blocked("172.16.0.1") is True
    assert is_ip_blocked("172.31.255.255") is True
    # Private Class C
    assert is_ip_blocked("192.168.1.1") is True
    # Link-local / AWS metadata
    assert is_ip_blocked("169.254.169.254") is True
    # Zero address
    assert is_ip_blocked("0.0.0.0") is True
    # IPv6 loopback
    assert is_ip_blocked("::1") is True

    # Public safe IPs should NOT be blocked
    assert is_ip_blocked("8.8.8.8") is False
    assert is_ip_blocked("1.1.1.1") is False
    assert is_ip_blocked("142.250.190.46") is False


@pytest.mark.asyncio
async def test_check_link_ssrf_suspicious():
    """Verify that localhost / internal IP URLs are flagged as suspicious."""
    res = await check_link("http://127.0.0.1/admin")
    assert res.result == "suspicious"
    assert "SSRF" in (res.error or "")


@pytest.mark.asyncio
async def test_check_link_dns_failure_broken():
    """Verify that non-existent domains are flagged as broken."""
    res = await check_link("https://this-domain-definitely-does-not-exist-spectra-test-12345.xyz")
    assert res.result == "broken"


def test_link_endpoints_demo(client):
    client.get("/api/channels/search?q=demo")
    # Scan demo
    scan_resp = client.post("/api/links/UCdemo123/scan")
    assert scan_resp.status_code == 200
    scan_data = scan_resp.json()
    assert scan_data["total"] == 20
    assert scan_data["working"] == 15
    assert scan_data["broken"] == 3
    assert scan_data["unverified"] == 2
    assert scan_data["demo"] is True

    # Results demo
    res_resp = client.get("/api/links/UCdemo123/results")
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    assert len(res_data["results"]) == 20
    assert res_data["demo"] is True

    # Summary demo
    sum_resp = client.get("/api/links/UCdemo123/summary")
    assert sum_resp.status_code == 200
    sum_data = sum_resp.json()
    assert sum_data["total"] == 20
    assert sum_data["working"] == 15
    assert sum_data["demo"] is True
