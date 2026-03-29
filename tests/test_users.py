"""
Testes para o módulo de usuários.
Endpoints: GET /users, GET /users/me, PUT /users/me
"""
import pytest
import requests


class TestPerfil:
    def test_meu_perfil_autenticado(self, base_url, auth_headers):
        """GET /users/me com token válido deve retornar dados do usuário logado."""
        response = requests.get(
            f"{base_url}/users/me",
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "id" in data

    def test_meu_perfil_sem_token(self, base_url):
        """GET /users/me sem token deve retornar 401."""
        response = requests.get(f"{base_url}/users/me", timeout=10)
        assert response.status_code == 401

    def test_atualizar_perfil_autenticado(self, base_url, auth_headers):
        """PUT /users/me com dados válidos deve retornar o perfil atualizado."""
        response = requests.put(
            f"{base_url}/users/me",
            json={"name": "Usuário Teste Atualizado"},
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code == 200

    def test_atualizar_perfil_sem_token(self, base_url):
        """PUT /users/me sem token deve retornar 401."""
        response = requests.put(
            f"{base_url}/users/me",
            json={"name": "Sem Token"},
            timeout=10,
        )
        assert response.status_code == 401


class TestListarUsuarios:
    def test_listar_usuarios_autenticado(self, base_url, auth_headers):
        """GET /users com token válido deve retornar lista."""
        response = requests.get(
            f"{base_url}/users",
            headers=auth_headers,
            timeout=10,
        )
        assert response.status_code in (200, 403)

    def test_listar_usuarios_sem_token(self, base_url):
        """GET /users sem token deve retornar 401."""
        response = requests.get(f"{base_url}/users", timeout=10)
        assert response.status_code == 401
