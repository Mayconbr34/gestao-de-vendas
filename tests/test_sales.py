"""
Testes do PDV (módulo de vendas).
Endpoints: GET /sales/availability, POST /sales, GET /sales, POST /sales/:id/cancel

Fluxo validado: cadastro de produto -> venda -> baixa de estoque -> cancelamento -> estorno.
"""
import uuid

import pytest
import requests


def _get(base_url, path, headers, **params):
    return requests.get(f"{base_url}{path}", headers=headers, params=params, timeout=10)


@pytest.fixture(scope="module")
def pdv_context(base_url, auth_headers):
    """Prepara empresa (com PDV habilitado), categoria e produto de teste."""
    me = _get(base_url, "/users/me", auth_headers).json()
    is_super = me.get("role") == "SUPER_ADMIN"
    company_id = me.get("companyId")
    if not company_id and is_super:
        companies = _get(base_url, "/companies", auth_headers).json()
        if not companies:
            pytest.skip("Nenhuma empresa cadastrada para testar o PDV")
        company_id = companies[0]["id"]
    if not company_id:
        pytest.skip("Usuário de teste sem empresa vinculada")

    scope = {"companyId": company_id} if is_super else {}
    availability = _get(base_url, "/sales/availability", auth_headers, **scope).json()
    restore_pdv = False
    if not availability.get("enabled"):
        if not is_super:
            pytest.skip("PDV desabilitado para a empresa do usuário de teste")
        resp = requests.put(
            f"{base_url}/companies/{company_id}",
            json={"enablePdv": True},
            headers=auth_headers,
            timeout=10,
        )
        assert resp.status_code == 200, resp.text
        restore_pdv = True

    category = requests.post(
        f"{base_url}/categories",
        json={"name": f"Categoria PDV {uuid.uuid4().hex[:6]}", **scope},
        headers=auth_headers,
        timeout=10,
    )
    assert category.status_code in (200, 201), category.text

    product = requests.post(
        f"{base_url}/products",
        json={
            "name": f"Produto PDV {uuid.uuid4().hex[:6]}",
            "sku": f"PDV-{uuid.uuid4().hex[:8]}",
            "ncm": "22021000",
            "origin": 0,
            "stock": 5,
            "price": 10.0,
            "costPrice": 6.0,
            "taxType": "TRIBUTADO",
            "categoryId": category.json()["id"],
            **scope,
        },
        headers=auth_headers,
        timeout=10,
    )
    assert product.status_code in (200, 201), product.text

    yield {"company_id": company_id, "scope": scope, "product": product.json()}

    requests.delete(f"{base_url}/products/{product.json()['id']}", headers=auth_headers, timeout=10)
    if restore_pdv:
        requests.put(
            f"{base_url}/companies/{company_id}",
            json={"enablePdv": False},
            headers=auth_headers,
            timeout=10,
        )


def _stock(base_url, headers, product_id):
    return _get(base_url, f"/products/{product_id}", headers).json()["stock"]


class TestVendas:
    def test_listar_vendas_sem_token(self, base_url):
        assert requests.get(f"{base_url}/sales", timeout=10).status_code == 401

    def test_venda_baixa_estoque_e_cancelamento_estorna(self, base_url, auth_headers, pdv_context):
        product = pdv_context["product"]
        payload = {
            "items": [{"productId": product["id"], "quantity": 2}],
            "paymentMethod": "PIX",
            **pdv_context["scope"],
        }
        resp = requests.post(f"{base_url}/sales", json=payload, headers=auth_headers, timeout=10)
        assert resp.status_code in (200, 201), resp.text
        sale = resp.json()

        # Preço vem do catálogo; total = 2 x 10,00
        assert sale["status"] == "COMPLETED"
        assert sale["total"] == pytest.approx(20.0)
        assert sale["itemsCount"] == 2
        assert _stock(base_url, auth_headers, product["id"]) == 3

        listed = _get(base_url, "/sales", auth_headers, limit=50, **pdv_context["scope"]).json()
        assert any(s["id"] == sale["id"] for s in listed)

        cancel = requests.post(f"{base_url}/sales/{sale['id']}/cancel", headers=auth_headers, timeout=10)
        if cancel.status_code == 403:
            pytest.skip("Usuário de teste não pode cancelar vendas")
        assert cancel.status_code in (200, 201), cancel.text
        assert cancel.json()["status"] == "CANCELED"
        assert _stock(base_url, auth_headers, product["id"]) == 5

        again = requests.post(f"{base_url}/sales/{sale['id']}/cancel", headers=auth_headers, timeout=10)
        assert again.status_code == 400

    def test_estoque_insuficiente(self, base_url, auth_headers, pdv_context):
        payload = {
            "items": [{"productId": pdv_context["product"]["id"], "quantity": 999}],
            "paymentMethod": "DINHEIRO",
            **pdv_context["scope"],
        }
        resp = requests.post(f"{base_url}/sales", json=payload, headers=auth_headers, timeout=10)
        assert resp.status_code == 400
        assert "Estoque insuficiente" in resp.text

    def test_desconto_maior_que_subtotal(self, base_url, auth_headers, pdv_context):
        payload = {
            "items": [{"productId": pdv_context["product"]["id"], "quantity": 1}],
            "paymentMethod": "DINHEIRO",
            "discount": 50,
            **pdv_context["scope"],
        }
        resp = requests.post(f"{base_url}/sales", json=payload, headers=auth_headers, timeout=10)
        assert resp.status_code == 400

    def test_validacao_payload(self, base_url, auth_headers, pdv_context):
        resp = requests.post(
            f"{base_url}/sales",
            json={"items": [], "paymentMethod": "BOLETO", **pdv_context["scope"]},
            headers=auth_headers,
            timeout=10,
        )
        assert resp.status_code == 400
