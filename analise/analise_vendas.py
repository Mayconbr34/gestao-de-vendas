"""
Análise exploratória e aprendizagem de máquina sobre os dados da plataforma.

O script consome a própria API REST (mesmos dados do dashboard), prepara os
dados com pandas e aplica:
  - análise exploratória (estatísticas descritivas, faturamento por dia,
    categoria, dia da semana e forma de pagamento);
  - regressão linear (scikit-learn) para tendência e previsão do faturamento;
  - k-means (scikit-learn) para segmentar os produtos, com escolha de k pelo
    coeficiente de silhueta.

Os gráficos e um resumo em Markdown são gravados em analise/saida/.

Uso:
    pip install -r analise/requirements.txt
    API_URL=http://localhost:3001 API_EMAIL=admin@admin.com API_PASSWORD=123456 \
        python analise/analise_vendas.py --dias 90
"""
from __future__ import annotations

import argparse
import os
from datetime import date, timedelta
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
import requests  # noqa: E402
from sklearn.cluster import KMeans  # noqa: E402
from sklearn.linear_model import LinearRegression  # noqa: E402
from sklearn.metrics import silhouette_score  # noqa: E402
from sklearn.preprocessing import StandardScaler  # noqa: E402

SAIDA = Path(__file__).resolve().parent / "saida"
DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]


# ─── Coleta ──────────────────────────────────────────────────────────────────

def autenticar(api_url: str, email: str, senha: str) -> dict:
    resp = requests.post(f"{api_url}/auth/login", json={"email": email, "password": senha}, timeout=15)
    resp.raise_for_status()
    token = resp.json().get("access_token") or resp.json().get("token")
    return {"Authorization": f"Bearer {token}"}


def coletar(api_url: str, headers: dict, inicio: str, fim: str, empresa: str | None):
    escopo = {"companyId": empresa} if empresa else {}
    vendas = requests.get(
        f"{api_url}/sales",
        headers=headers,
        params={"from": inicio, "to": fim, "limit": 500, **escopo},
        timeout=30,
    )
    vendas.raise_for_status()
    produtos = requests.get(f"{api_url}/products", headers=headers, params=escopo, timeout=30)
    produtos.raise_for_status()
    return vendas.json(), produtos.json()


# ─── Preparação ──────────────────────────────────────────────────────────────

def preparar(vendas: list[dict], produtos: list[dict]):
    """Limpeza, tipagem e transformação dos dados brutos."""
    df_vendas = pd.DataFrame(vendas)
    df_produtos = pd.DataFrame(produtos)
    relatorio = {"vendas_brutas": len(df_vendas), "produtos_brutos": len(df_produtos)}

    if df_vendas.empty:
        return df_vendas, pd.DataFrame(), df_produtos, relatorio

    df_vendas = df_vendas.drop_duplicates(subset="id")
    relatorio["vendas_canceladas"] = int((df_vendas["status"] == "CANCELED").sum())
    df_vendas = df_vendas[df_vendas["status"] == "COMPLETED"].copy()
    df_vendas["createdAt"] = pd.to_datetime(df_vendas["createdAt"], utc=True).dt.tz_convert("America/Sao_Paulo")
    df_vendas["dia"] = df_vendas["createdAt"].dt.date
    df_vendas["dia_semana"] = df_vendas["createdAt"].dt.dayofweek
    df_vendas["hora"] = df_vendas["createdAt"].dt.hour
    for coluna in ("subtotal", "discount", "total"):
        df_vendas[coluna] = pd.to_numeric(df_vendas[coluna], errors="coerce").fillna(0.0)

    itens = df_vendas[["id", "dia", "items"]].explode("items").dropna(subset=["items"])
    df_itens = pd.concat(
        [itens[["id", "dia"]].reset_index(drop=True), pd.json_normalize(itens["items"].tolist())],
        axis=1,
    ).rename(columns={"id": "sale_id"})
    df_itens["categoryName"] = df_itens["categoryName"].fillna("Sem categoria")

    if not df_produtos.empty:
        for coluna in ("price", "costPrice", "stock"):
            df_produtos[coluna] = pd.to_numeric(df_produtos[coluna], errors="coerce")
        relatorio["produtos_sem_custo"] = int(df_produtos["costPrice"].isna().sum())
        relatorio["produtos_sem_codigo_barras"] = int(df_produtos["barcode"].isna().sum())
        relatorio["skus_duplicados"] = int(df_produtos["sku"].dropna().duplicated().sum())

    relatorio["vendas_validas"] = len(df_vendas)
    relatorio["itens_vendidos"] = len(df_itens)
    return df_vendas, df_itens, df_produtos, relatorio


# ─── Análise exploratória ────────────────────────────────────────────────────

def exploratoria(df_vendas: pd.DataFrame, df_itens: pd.DataFrame, inicio: str, fim: str):
    dias = pd.date_range(inicio, fim, freq="D").date
    por_dia = df_vendas.groupby("dia")["total"].sum().reindex(dias, fill_value=0.0)

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.bar([d.strftime("%d/%m") for d in por_dia.index], por_dia.values, color="#2563eb")
    ax.set_title("Faturamento diário")
    ax.set_ylabel("R$")
    ax.tick_params(axis="x", rotation=60, labelsize=7)
    fig.tight_layout()
    fig.savefig(SAIDA / "faturamento_diario.png", dpi=150)
    plt.close(fig)

    por_categoria = df_itens.groupby("categoryName")["total"].sum().sort_values(ascending=False)
    fig, ax = plt.subplots(figsize=(7, 4))
    por_categoria.plot.barh(ax=ax, color="#10b981")
    ax.invert_yaxis()
    ax.set_title("Faturamento por categoria")
    ax.set_xlabel("R$")
    fig.tight_layout()
    fig.savefig(SAIDA / "faturamento_categoria.png", dpi=150)
    plt.close(fig)

    por_semana = df_vendas.groupby("dia_semana")["total"].sum().reindex(range(7), fill_value=0.0)
    fig, ax = plt.subplots(figsize=(7, 3.5))
    ax.bar(DIAS_SEMANA, por_semana.values, color="#6366f1")
    ax.set_title("Faturamento por dia da semana")
    fig.tight_layout()
    fig.savefig(SAIDA / "faturamento_dia_semana.png", dpi=150)
    plt.close(fig)

    descritiva = df_vendas["total"].describe().round(2)
    return por_dia, por_categoria, descritiva


# ─── Aprendizagem de máquina ─────────────────────────────────────────────────

def previsao(por_dia: pd.Series, horizonte: int = 7):
    """Regressão linear simples: faturamento em função do índice do dia."""
    x = np.arange(len(por_dia)).reshape(-1, 1)
    y = por_dia.values
    modelo = LinearRegression().fit(x, y)
    futuro = np.arange(len(por_dia), len(por_dia) + horizonte).reshape(-1, 1)
    projecao = np.clip(modelo.predict(futuro), 0, None)
    r2 = modelo.score(x, y)

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(range(len(y)), y, label="Faturamento", color="#2563eb")
    ax.plot(range(len(y)), modelo.predict(x), label="Tendência", color="#6366f1")
    ax.plot(futuro.ravel(), projecao, "--o", label="Previsão", color="#f59e0b")
    ax.set_title(f"Tendência e previsão (R² = {r2:.3f})")
    ax.set_xlabel("Dia do período")
    ax.legend()
    fig.tight_layout()
    fig.savefig(SAIDA / "previsao_faturamento.png", dpi=150)
    plt.close(fig)
    return float(modelo.coef_[0]), float(r2), projecao


def segmentar(df_itens: pd.DataFrame, df_produtos: pd.DataFrame):
    """K-means sobre giro, margem, preço e estoque; k escolhido pela silhueta."""
    if len(df_produtos) < 6:
        return None
    vendidos = df_itens.groupby("productId").agg(quantidade=("quantity", "sum"), faturamento=("total", "sum"))
    base = df_produtos.set_index("id").join(vendidos, how="left").fillna({"quantidade": 0, "faturamento": 0})
    base["margem"] = (base["price"] - base["costPrice"]) / base["price"] * 100
    base["margem"] = base["margem"].fillna(base["margem"].mean()).fillna(0)  # imputação pela média

    x = np.column_stack(
        [
            np.log1p(base["quantidade"]),
            base["margem"],
            np.log1p(base["price"]),
            np.log1p(base["stock"].clip(lower=0)),
        ]
    )
    x = StandardScaler().fit_transform(x)

    melhores = []
    for k in range(2, min(6, len(base))):
        modelo = KMeans(n_clusters=k, n_init=10, random_state=42).fit(x)
        if len(set(modelo.labels_)) > 1:
            melhores.append((silhouette_score(x, modelo.labels_), k, modelo))
    if not melhores:
        return None
    silhueta, k, modelo = max(melhores, key=lambda item: item[0])
    base["grupo"] = modelo.labels_

    resumo = (
        base.groupby("grupo")
        .agg(
            produtos=("name", "count"),
            quantidade_media=("quantidade", "mean"),
            margem_media=("margem", "mean"),
            preco_medio=("price", "mean"),
            estoque_medio=("stock", "mean"),
        )
        .round(1)
        .sort_values("quantidade_media", ascending=False)
    )

    fig, ax = plt.subplots(figsize=(7, 5))
    dispersao = ax.scatter(base["quantidade"], base["margem"], c=base["grupo"], cmap="viridis", s=60)
    for _, linha in base.iterrows():
        ax.annotate(str(linha["name"])[:18], (linha["quantidade"], linha["margem"]), fontsize=6, alpha=0.7)
    ax.set_xlabel("Quantidade vendida no período")
    ax.set_ylabel("Margem bruta (%)")
    ax.set_title(f"Segmentação de produtos (k-means, k={k}, silhueta={silhueta:.2f})")
    fig.colorbar(dispersao, ax=ax, label="Grupo")
    fig.tight_layout()
    fig.savefig(SAIDA / "segmentacao_produtos.png", dpi=150)
    plt.close(fig)
    return {"k": k, "silhueta": float(silhueta), "resumo": resumo}


# ─── Execução ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dias", type=int, default=90, help="tamanho do período analisado (padrão: 90)")
    parser.add_argument("--empresa", default=os.getenv("COMPANY_ID"), help="companyId (somente super admin)")
    args = parser.parse_args()

    api_url = os.getenv("API_URL", "http://localhost:3001")
    headers = autenticar(api_url, os.getenv("API_EMAIL", "admin@admin.com"), os.getenv("API_PASSWORD", "123456"))
    fim = date.today()
    inicio = fim - timedelta(days=args.dias - 1)

    SAIDA.mkdir(parents=True, exist_ok=True)
    vendas, produtos = coletar(api_url, headers, inicio.isoformat(), fim.isoformat(), args.empresa)
    df_vendas, df_itens, df_produtos, relatorio = preparar(vendas, produtos)

    linhas = [f"# Análise de vendas — {inicio:%d/%m/%Y} a {fim:%d/%m/%Y}", "", "## Preparação dos dados", ""]
    linhas += [f"- {chave.replace('_', ' ')}: {valor}" for chave, valor in relatorio.items()]

    if df_vendas.empty:
        linhas += ["", "Nenhuma venda concluída no período."]
    else:
        por_dia, por_categoria, descritiva = exploratoria(df_vendas, df_itens, inicio.isoformat(), fim.isoformat())
        inclinacao, r2, projecao = previsao(por_dia)
        linhas += [
            "",
            "## Indicadores",
            "",
            f"- Faturamento: R$ {df_vendas['total'].sum():,.2f}",
            f"- Pedidos: {len(df_vendas)}",
            f"- Ticket médio: R$ {df_vendas['total'].mean():,.2f}",
            "",
            "## Estatística descritiva do valor por venda",
            "",
            descritiva.to_markdown(),
            "",
            "## Faturamento por categoria",
            "",
            por_categoria.round(2).to_markdown(),
            "",
            "## Regressão linear",
            "",
            f"- Inclinação: R$ {inclinacao:,.2f} por dia (R² = {r2:.3f})",
            f"- Previsão para os próximos 7 dias: R$ {projecao.sum():,.2f}",
        ]
        segmentos = segmentar(df_itens, df_produtos)
        if segmentos:
            linhas += [
                "",
                f"## Segmentação k-means (k = {segmentos['k']}, silhueta = {segmentos['silhueta']:.2f})",
                "",
                segmentos["resumo"].to_markdown(),
            ]

    (SAIDA / "resumo.md").write_text("\n".join(linhas), encoding="utf-8")
    print("\n".join(linhas))
    print(f"\nArquivos gerados em {SAIDA}")


if __name__ == "__main__":
    main()
