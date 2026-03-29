"""
Testes para o módulo de produtos.
Endpoints: GET/POST /products, GET/PUT/DELETE /products/:id
"""
import uuid
import pytest
import requests


PRODUCT_PAYLOAD = {
    "name": "Produto Teste Python",
    "description": "Criado pelo teste automatizado",
    "price": 99.90,
    "ncm": "12345678",
    "unit": "UN",
}


class TestListarProdutos:
    def test_listar_produtos_autenticado(self, base_url, auth_headers):
        """GET /products com token válido deve retornar lista."""
        response = requests.get(
            f"{base_url}/products",
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_listar_produtos_sem_token(self, base_url):
        """GET /products sem token deve retornar 401."""
        response = requests.get(f"{base_url}/products", timeout=10)
        assert response.status_code == 401


class TestCriarProduto:
    def test_criar_produto_autenticado(self, base_url, auth_headers):
        """POST /products com dados válidos deve criar e retornar o produto."""
        payload = {**PRODUCT_PAYLOAD, "name": f"Produto Teste {uuid.uuid4().hex[:6]}"}
        response = requests.post(
            f"{base_url}/products",
            json=payload,
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert "id" in data
        assert data["name"] == payload["name"]

    def test_criar_produto_sem_token(self, base_url):
        """POST /products sem token deve retornar 401."""
        response = requests.post(
            f"{base_url}/products",
            json=PRODUCT_PAYLOAD,
            timeout=10,
        )
        assert response.status_code == 401

    def test_criar_produto_sem_nome(self, base_url, auth_headers):
        """POST /products sem campo obrigatório 'name' deve retornar 400."""
        payload = {k: v for k, v in PRODUCT_PAYLOAD.items() if k != "name"}
        response = requests.post(
            f"{base_url}/products",
            json=payload,
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code == 400


class TestBuscarProduto:
    def test_buscar_produto_inexistente(self, base_url, auth_headers):
        """GET /products/:id com ID inválido deve retornar 404."""
        fake_id = str(uuid.uuid4())
        response = requests.get(
            f"{base_url}/products/{fake_id}",
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code in (404, 403)


class TestAtualizarProduto:
    def test_atualizar_produto_inexistente(self, base_url, auth_headers):
        """PUT /products/:id com ID inválido deve retornar 404."""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{base_url}/products/{fake_id}",
            json={"name": "Atualizado"},
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code in (404, 403)


class TestDeletarProduto:
    def test_deletar_produto_inexistente(self, base_url, auth_headers):
        """DELETE /products/:id com ID inválido deve retornar 404."""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{base_url}/products/{fake_id}",
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code in (404, 403)


class TestCicloCRUDProduto:
    """Testa o ciclo completo: criar -> buscar -> atualizar -> deletar."""

    def test_ciclo_crud_completo(self, base_url, auth_headers):
        nome_unico = f"CRUD Teste {uuid.uuid4().hex[:8]}"
        payload = {**PRODUCT_PAYLOAD, "name": nome_unico}

        # Criar
        r_create = requests.post(
            f"{base_url}/products",
            json=payload,
            headers=auth_headers,
            timeout=10,
        )
        assert r_create.status_code in (200, 201)
        produto_id = r_create.json()["id"]

        # Buscar
        r_get = requests.get(
            f"{base_url}/products/{produto_id}",
            headers=auth_headers,
            timeout=10,
        )
        assert r_get.status_code == 200
        assert r_get.json()["id"] == produto_id

        # Atualizar
        r_update = requests.put(
            f"{base_url}/products/{produto_id}",
            json={"name": f"{nome_unico} Atualizado"},
            headers=auth_headers,
            timeout=10,
        )
        assert r_update.status_code == 200
        assert "Atualizado" in r_update.json()["name"]

        # Deletar
        r_delete = requests.delete(
            f"{base_url}/products/{produto_id}",
            headers=auth_headers,
            timeout=10,
        )
        assert r_delete.status_code == 200
