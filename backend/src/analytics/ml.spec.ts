import { forecastLinear, kmeans, linearRegression, movingAverage, standardize } from './ml';

describe('linearRegression', () => {
  it('recupera a reta exata de dados sem ruído', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = xs.map((x) => 2 * x + 10);
    const model = linearRegression(xs, ys);
    expect(model.slope).toBeCloseTo(2);
    expect(model.intercept).toBeCloseTo(10);
    expect(model.r2).toBeCloseTo(1);
  });

  it('trata série constante sem dividir por zero', () => {
    const model = linearRegression([0, 1, 2], [5, 5, 5]);
    expect(model.slope).toBe(0);
    expect(model.intercept).toBe(5);
  });
});

describe('forecastLinear', () => {
  it('projeta a tendência e nunca devolve valores negativos', () => {
    const rising = forecastLinear([10, 20, 30, 40], 2);
    expect(rising.forecast[0]).toBeCloseTo(50);
    expect(rising.forecast[1]).toBeCloseTo(60);

    const falling = forecastLinear([30, 20, 10, 0], 3);
    falling.forecast.forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
  });
});

describe('movingAverage', () => {
  it('usa a janela disponível nos primeiros pontos', () => {
    expect(movingAverage([2, 4, 6, 8], 2)).toEqual([2, 3, 5, 7]);
  });
});

describe('standardize', () => {
  it('gera colunas com média zero', () => {
    const { data } = standardize([
      [1, 100],
      [2, 200],
      [3, 300]
    ]);
    const meanCol0 = data.reduce((sum, row) => sum + row[0], 0) / data.length;
    expect(meanCol0).toBeCloseTo(0);
  });
});

describe('kmeans', () => {
  it('separa grupos bem definidos e é reprodutível', () => {
    const points = [
      [0, 0],
      [0.1, 0.2],
      [0.2, 0.1],
      [10, 10],
      [10.1, 9.9],
      [9.8, 10.2]
    ];
    const first = kmeans(points, 2, { seed: 7 });
    const second = kmeans(points, 2, { seed: 7 });
    expect(first.labels).toEqual(second.labels);
    expect(first.labels[0]).toBe(first.labels[1]);
    expect(first.labels[0]).toBe(first.labels[2]);
    expect(first.labels[3]).toBe(first.labels[4]);
    expect(first.labels[0]).not.toBe(first.labels[3]);
  });

  it('limita k à quantidade de pontos', () => {
    const result = kmeans([[1], [2]], 5);
    expect(result.centroids.length).toBe(2);
  });
});
