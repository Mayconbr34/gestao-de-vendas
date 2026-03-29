"""
Testes de sanidade (smoke tests) - verifica se a API está no ar e respondendo.
"""
import pytest
import requests


class TestSanidade:
    def test_api_esta_no_ar(self, base_url):
        """A API deve responder a requisições HTTP."""
        try:
            response = requests.get(f"{base_url}/docs-json", timeout=10)
            assert response.status_code in (200, 404)
        except requests.exceptions.ConnectionError:
            pytest.fail(f"API não está acessível em {base_url}")

    def test_rota_invalida_retorna_404(self, base_url):
        """Rota inexistente deve retornar 404."""
        response = requests.get(f"{base_url}/rota-que-nao-existe-xyz", timeout=10)
        assert response.status_code == 404

    def test_endpoint_protegido_sem_token_retorna_401(self, base_url):
        """Endpoints protegidos sem token devem retornar 401."""
        response = requests.get(f"{base_url}/products", timeout=10)
        assert response.status_code == 401

    def test_login_endpoint_existe(self, base_url):
        """POST /auth/login deve existir (não retornar 404)."""
        response = requests.post(
            f"{base_url}/auth/login",
            json={},
            timeout=10,
        )
        assert response.status_code != 404

    def test_swagger_disponivel(self, base_url):
        """Documentação Swagger deve estar disponível em /docs."""
        response = requests.get(f"{base_url}/docs", timeout=10)
        assert response.status_code in (200, 301, 302)
