"""
Testes para o módulo de categorias.
Endpoints: GET /categories, POST /categories, PUT /categories/:id
"""
import uuid
import pytest
import requests


class TestListarCategorias:
    def test_listar_categorias_autenticado(self, base_url, auth_headers):
        """GET /categories com token válido deve retornar lista."""
        response = requests.get(
            f"{base_url}/categories",
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_listar_categorias_sem_token(self, base_url):
        """GET /categories sem token deve retornar 401."""
        response = requests.get(f"{base_url}/categories", timeout=10)
        assert response.status_code == 401


class TestCriarCategoria:
    def test_criar_categoria_autenticada(self, base_url, auth_headers):
        """POST /categories com dados válidos deve criar a categoria."""
        nome = f"Categoria Teste {uuid.uuid4().hex[:6]}"
        response = requests.post(
            f"{base_url}/categories",
            json={"name": nome},
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code in (200, 201)
        data = response.json()
        assert "id" in data
        assert data["name"] == nome

    def test_criar_categoria_sem_token(self, base_url):
        """POST /categories sem token deve retornar 401."""
        response = requests.post(
            f"{base_url}/categories",
            json={"name": "Categoria Sem Token"},
            timeout=10,
        )
        assert response.status_code == 401

    def test_criar_categoria_sem_nome(self, base_url, auth_headers):
        """POST /categories sem 'name' deve retornar 400."""
        response = requests.post(
            f"{base_url}/categories",
            json={},
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code == 400


class TestAtualizarCategoria:
    def test_atualizar_categoria_inexistente(self, base_url, auth_headers):
        """PUT /categories/:id com ID inválido deve retornar 404."""
        fake_id = str(uuid.uuid4())
        response = requests.put(
            f"{base_url}/categories/{fake_id}",
            json={"name": "Novo Nome"},
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code in (404, 403)


class TestCicloCategorias:
    """Testa criar e atualizar uma categoria."""

    def test_criar_e_atualizar_categoria(self, base_url, auth_headers):
        nome = f"Cat {uuid.uuid4().hex[:8]}"

        # Criar
        r_create = requests.post(
            f"{base_url}/categories",
            json={"name": nome},
            headers=auth_headers,
            timeout=10,
        )
        assert r_create.status_code in (200, 201)
        cat_id = r_create.json()["id"]

        # Atualizar
        novo_nome = f"{nome} Editado"
        r_update = requests.put(
            f"{base_url}/categories/{cat_id}",
            json={"name": novo_nome},
            headers=auth_headers,
            timeout=10,
        )
        assert r_update.status_code == 200
        assert r_update.json()["name"] == novo_nome
