"""
Testes unitários/integração para o módulo de autenticação.
Endpoints: POST /auth/login, POST /auth/register, GET /auth/session
"""
import pytest
import requests


class TestLogin:
    def test_login_credenciais_validas(self, base_url, auth_token):
        """Login com credenciais válidas deve retornar token JWT."""
        assert auth_token is not None
        assert len(auth_token) > 10

    def test_login_credenciais_invalidas(self, base_url):
        """Login com senha errada deve retornar 401."""
        response = requests.post(
            f"{base_url}/auth/login",
            json={"email": "naoexiste@example.com", "password": "senhaerrada"},
            timeout=10,
        )
        assert response.status_code == 401

    def test_login_sem_email(self, base_url):
        """Login sem email deve retornar 400."""
        response = requests.post(
            f"{base_url}/auth/login",
            json={"password": "qualquercoisa"},
            timeout=10,
        )
        assert response.status_code == 400

    def test_login_sem_senha(self, base_url):
        """Login sem senha deve retornar 400."""
        response = requests.post(
            f"{base_url}/auth/login",
            json={"email": "alguem@example.com"},
            timeout=10,
        )
        assert response.status_code == 400

    def test_login_body_vazio(self, base_url):
        """Login com body vazio deve retornar 400."""
        response = requests.post(
            f"{base_url}/auth/login",
            json={},
            timeout=10,
        )
        assert response.status_code == 400

    def test_login_retorna_dados_do_usuario(self, base_url):
        """Resposta do login deve conter dados básicos do usuário."""
        import os
        email = os.getenv("TEST_ADMIN_EMAIL", "admin@example.com")
        password = os.getenv("TEST_ADMIN_PASSWORD", "admin123")

        response = requests.post(
            f"{base_url}/auth/login",
            json={"email": email, "password": password},
            timeout=10,
        )
        data = response.json()
        assert "user" in data
        assert "email" in data["user"]


class TestSession:
    def test_session_autenticado(self, base_url, auth_headers):
        """GET /auth/session com token válido deve retornar dados da sessão."""
        response = requests.get(
            f"{base_url}/auth/session",
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code == 200
        data = response.json()
        assert "ip" in data
        assert "userAgent" in data

    def test_session_sem_token(self, base_url):
        """GET /auth/session sem token deve retornar 401."""
        response = requests.get(
            f"{base_url}/auth/session",
            timeout=10,
        )
        assert response.status_code == 401

    def test_session_token_invalido(self, base_url):
        """GET /auth/session com token inválido deve retornar 401."""
        response = requests.get(
            f"{base_url}/auth/session",
            headers={"Authorization": "Bearer token_invalido_xyz"},
            timeout=10,
        )
        assert response.status_code == 401
