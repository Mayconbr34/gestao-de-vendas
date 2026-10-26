/**
 * Funções de aprendizagem de máquina usadas pelo dashboard analítico.
 * Implementadas sem dependências externas para rodar dentro da própria API:
 *  - regressão linear por mínimos quadrados (aprendizagem supervisionada) para tendência e previsão;
 *  - k-means com inicialização k-means++ (aprendizagem não supervisionada) para segmentar produtos.
 */

export type RegressionResult = {
  slope: number;
  intercept: number;
  /** Coeficiente de determinação (0 a 1). */
  r2: number;
};

export function linearRegression(xs: number[], ys: number[]): RegressionResult {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0], r2: 0 };

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += xs[i];
    sumY += ys[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) return { slope: 0, intercept: meanY, r2: 0 };
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
}

export type ForecastResult = RegressionResult & {
  /** Valores previstos para os próximos `horizon` períodos (nunca negativos). */
  forecast: number[];
  /** Valores ajustados pelo modelo para o período observado. */
  fitted: number[];
};

/** Ajusta uma reta à série (x = índice do dia) e projeta os próximos períodos. */
export function forecastLinear(series: number[], horizon: number): ForecastResult {
  const xs = series.map((_, index) => index);
  const model = linearRegression(xs, series);
  const predict = (x: number) => Math.max(0, model.intercept + model.slope * x);
  return {
    ...model,
    fitted: xs.map(predict),
    forecast: Array.from({ length: Math.max(0, horizon) }, (_, i) => predict(series.length + i))
  };
}

/** Média móvel simples; os primeiros pontos usam a janela disponível. */
export function movingAverage(series: number[], window: number) {
  const size = Math.max(1, Math.floor(window));
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i];
    if (i >= size) sum -= series[i - size];
    result.push(sum / Math.min(i + 1, size));
  }
  return result;
}

/** Gerador pseudoaleatório determinístico (mulberry32), para resultados reprodutíveis. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Padroniza cada coluna (z-score) para que nenhuma variável domine a distância. */
export function standardize(matrix: number[][]) {
  if (!matrix.length) return { data: [] as number[][], means: [] as number[], stds: [] as number[] };
  const dims = matrix[0].length;
  const means = new Array(dims).fill(0);
  const stds = new Array(dims).fill(0);
  for (const row of matrix) for (let d = 0; d < dims; d++) means[d] += row[d];
  for (let d = 0; d < dims; d++) means[d] /= matrix.length;
  for (const row of matrix) for (let d = 0; d < dims; d++) stds[d] += (row[d] - means[d]) ** 2;
  for (let d = 0; d < dims; d++) stds[d] = Math.sqrt(stds[d] / matrix.length) || 1;
  return {
    data: matrix.map((row) => row.map((value, d) => (value - means[d]) / stds[d])),
    means,
    stds
  };
}

function squaredDistance(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return sum;
}

export type KMeansResult = {
  labels: number[];
  centroids: number[][];
  /** Soma das distâncias quadráticas aos centróides (quanto menor, mais compactos os grupos). */
  inertia: number;
  iterations: number;
};

function kmeansOnce(points: number[][], k: number, random: () => number, maxIter: number): KMeansResult {
  // Inicialização k-means++: cada novo centróide é sorteado com probabilidade proporcional à distância.
  const centroids: number[][] = [points[Math.floor(random() * points.length)].slice()];
  while (centroids.length < k) {
    const distances = points.map((p) => Math.min(...centroids.map((c) => squaredDistance(p, c))));
    const total = distances.reduce((a, b) => a + b, 0);
    if (total === 0) {
      centroids.push(points[Math.floor(random() * points.length)].slice());
      continue;
    }
    let threshold = random() * total;
    let chosen = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        chosen = i;
        break;
      }
    }
    centroids.push(points[chosen].slice());
  }

  const labels = new Array(points.length).fill(0);
  let iterations = 0;
  for (; iterations < maxIter; iterations++) {
    let changed = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0;
      let bestDistance = Infinity;
      for (let c = 0; c < k; c++) {
        const distance = squaredDistance(points[i], centroids[c]);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = c;
        }
      }
      if (labels[i] !== best) {
        changed = true;
        labels[i] = best;
      }
    }

    const dims = points[0].length;
    const sums = Array.from({ length: k }, () => new Array(dims).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < points.length; i++) {
      counts[labels[i]] += 1;
      for (let d = 0; d < dims; d++) sums[labels[i]][d] += points[i][d];
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) centroids[c] = sums[c].map((value) => value / counts[c]);
    }
    if (!changed && iterations > 0) break;
  }

  const inertia = points.reduce((sum, p, i) => sum + squaredDistance(p, centroids[labels[i]]), 0);
  return { labels, centroids, inertia, iterations: iterations + 1 };
}

/** K-means com várias inicializações; devolve a de menor inércia. */
export function kmeans(
  points: number[][],
  k: number,
  options: { seed?: number; nInit?: number; maxIter?: number } = {}
): KMeansResult {
  if (!points.length) return { labels: [], centroids: [], inertia: 0, iterations: 0 };
  const clusters = Math.max(1, Math.min(k, points.length));
  const random = seededRandom(options.seed ?? 42);
  const nInit = options.nInit ?? 10;
  const maxIter = options.maxIter ?? 100;

  let best: KMeansResult | null = null;
  for (let run = 0; run < nInit; run++) {
    const result = kmeansOnce(points, clusters, random, maxIter);
    if (!best || result.inertia < best.inertia) best = result;
  }
  return best as KMeansResult;
}
