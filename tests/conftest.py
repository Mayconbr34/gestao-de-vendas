"""
Configuração global dos testes.
Define fixtures compartilhadas entre todos os módulos de teste.
"""
import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../backend/.env"))

BASE_URL = os.getenv("TEST_API_URL", "http://localhost:3001")
ADMIN_EMAIL = os.getenv("TEST_ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD", "admin123")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def auth_token(base_url):
    """Faz login e retorna o token JWT para uso nos testes."""
    response = requests.post(
        f"{base_url}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10,
    )
    assert response.status_code == 200, (
        f"Falha no login de teste. Status: {response.status_code}, "
        f"Body: {response.text}"
    )
    token = response.json().get("token") or response.json().get("access_token")
    assert token, "Token JWT não encontrado na resposta do login"
    return token


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    """Retorna headers com Authorization Bearer para requisições autenticadas."""
    return {"Authorization": f"Bearer {auth_token}"}
