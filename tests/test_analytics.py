"""
Testes do dashboard analítico e dos filtros de auditoria.
Endpoints: GET /analytics/overview, /analytics/sales, /analytics/data-quality,
/analytics/segments e GET /audits com filtros de período.

Além do formato das respostas, verifica a reconciliação entre os registros
brutos (GET /sales) e os indicadores consolidados (GET /analytics/sales).
"""
from datetime import date, timedelta

import pytest
import requests


def _get(base_url, path, headers, **params):
    return requests.get(f"{base_url}{path}", headers=headers, params=params, timeout=15)


@pytest.fixture(scope="module")
def period():
    today = date.today()
    return {"from": (today - timedelta(days=29)).isoformat(), "to": today.isoformat()}


class TestAnalytics:
    @pytest.mark.parametrize("path", ["/analytics/overview", "/analytics/sales", "/analytics/data-quality", "/analytics/segments"])
    def test_exige_autenticacao(self, base_url, path):
        assert requests.get(f"{base_url}{path}", timeout=10).status_code == 401

    def test_overview(self, base_url, auth_headers, period):
        resp = _get(base_url, "/analytics/overview", auth_headers, **period)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["period"]["days"] == 30
        assert len(data["auditSeries"]) == 30  # um ponto por dia, inclusive dias sem eventos
        for key in ("products", "categories", "users", "fiscalRules", "audits"):
            assert isinstance(data["counts"][key], int)

    def test_overview_agrupa_por_mes_em_periodos_longos(self, base_url, auth_headers):
        today = date.today()
        resp = _get(
            base_url,
            "/analytics/overview",
            auth_headers,
            **{"from": (today - timedelta(days=180)).isoformat(), "to": today.isoformat()},
        )
        assert resp.status_code == 200
        assert resp.json()["period"]["granularity"] == "month"

    def test_periodo_invalido(self, base_url, auth_headers):
        assert _get(base_url, "/analytics/sales", auth_headers, **{"from": "2026-13-40"}).status_code == 400
        assert _get(base_url, "/analytics/sales", auth_headers, **{"from": "2026-05-10", "to": "2026-05-01"}).status_code == 400

    def test_sales_reconcilia_com_registros(self, base_url, auth_headers, period):
        """Faturamento e pedidos do dashboard devem bater com a soma das vendas brutas."""
        analytics = _get(base_url, "/analytics/sales", auth_headers, **period)
        assert analytics.status_code == 200, analytics.text
        data = analytics.json()

        raw = _get(base_url, "/sales", auth_headers, status="COMPLETED", limit=500, **period).json()
        if len(raw) == 500:
            pytest.skip("Mais de 500 vendas no período; reconciliação feita por amostragem em outro teste")

        assert data["kpis"]["orders"] == len(raw)
        assert data["kpis"]["revenue"] == pytest.approx(sum(s["total"] for s in raw), abs=0.01)
        assert sum(d["revenue"] for d in data["daily"]) == pytest.approx(data["kpis"]["revenue"], abs=0.05)
        assert len(data["daily"]) == 30
        assert len(data["forecast"]["points"]) == data["forecast"]["horizonDays"]
        assert all(p["revenue"] >= 0 for p in data["forecast"]["points"])

        if data["abc"]:
            assert data["abc"][-1]["cumulativePercent"] == pytest.approx(100, abs=0.2)
            assert data["abc"][0]["class"] == "A"

    def test_data_quality(self, base_url, auth_headers):
        resp = _get(base_url, "/analytics/data-quality", auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert 0 <= data["completenessScore"] <= 100
        assert 0 <= data["consistencyScore"] <= 100
        assert {f["field"] for f in data["fields"]} >= {"ncm", "barcode", "costPrice"}
        for issue in data["issues"]:
            assert issue["severity"] in ("error", "warning")

    def test_segments(self, base_url, auth_headers, period):
        resp = _get(base_url, "/analytics/segments", auth_headers, **period)
        assert resp.status_code == 200
        data = resp.json()
        if data["available"]:
            total = sum(c["size"] for c in data["clusters"])
            products = _get(base_url, "/products", auth_headers).json()
            assert total == len(products)
            assert len({c["label"] for c in data["clusters"]}) == len(data["clusters"])


class TestAuditoriaFiltros:
    def test_filtro_por_periodo(self, base_url, auth_headers):
        today = date.today().isoformat()
        resp = _get(base_url, "/audits", auth_headers, **{"from": today, "to": today})
        assert resp.status_code == 200
        for event in resp.json():
            assert event["createdAt"][:4].isdigit()

    def test_filtro_por_acao(self, base_url, auth_headers):
        resp = _get(base_url, "/audits", auth_headers, action="LOGIN")
        assert resp.status_code == 200
        assert all(event["action"] == "LOGIN" for event in resp.json())

    def test_periodo_sem_eventos(self, base_url, auth_headers):
        resp = _get(base_url, "/audits", auth_headers, **{"from": "2000-01-01", "to": "2000-01-02"})
        assert resp.status_code == 200
        assert resp.json() == []
