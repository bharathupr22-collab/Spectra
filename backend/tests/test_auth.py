"""Tests for authentication endpoints."""

def test_signup_success(client):
    resp = client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@example.com", "password": "password123"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["name"] == "Alice"
    assert data["user"]["email"] == "alice@example.com"


def test_signup_duplicate_email(client):
    client.post(
        "/api/auth/signup",
        json={"name": "Alice", "email": "alice@example.com", "password": "password123"},
    )
    resp = client.post(
        "/api/auth/signup",
        json={"name": "Alice2", "email": "alice@example.com", "password": "password456"},
    )
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"]


def test_login_success(client):
    client.post(
        "/api/auth/signup",
        json={"name": "Bob", "email": "bob@example.com", "password": "mypassword"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "mypassword"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client):
    client.post(
        "/api/auth/signup",
        json={"name": "Bob", "email": "bob@example.com", "password": "mypassword"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "wrongpassword"},
    )
    assert resp.status_code == 401


def test_me_endpoint_authenticated(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"


def test_me_endpoint_unauthenticated(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
