import { analyzeDataQuality, isValidGtin, ProductRecord } from './data-quality';

const base: ProductRecord = {
  id: '1',
  name: 'Produto completo',
  sku: 'SKU-1',
  ncm: '22021000',
  cest: '0300700',
  barcode: '7894900011517',
  origin: 0,
  price: 10,
  costPrice: 6,
  stock: 5,
  taxType: 'TRIBUTADO',
  taxProfileId: null,
  imageUrl: '/uploads/products/x.png',
  categoryName: 'Bebidas'
};

describe('isValidGtin', () => {
  it('valida o dígito verificador do EAN-13', () => {
    expect(isValidGtin('7894900011517')).toBe(true);
    expect(isValidGtin('7894900011518')).toBe(false);
    expect(isValidGtin('ABC')).toBe(false);
  });
});

describe('analyzeDataQuality', () => {
  it('não aponta problemas em um cadastro completo', () => {
    const report = analyzeDataQuality([base]);
    expect(report.issues).toHaveLength(0);
    expect(report.consistencyScore).toBe(100);
  });

  it('identifica lacunas e inconsistências', () => {
    const report = analyzeDataQuality([
      base,
      {
        ...base,
        id: '2',
        name: 'Produto com problemas',
        sku: 'SKU-1',
        ncm: '123',
        cest: null,
        barcode: '7894900011517',
        costPrice: 12,
        stock: -1,
        taxType: 'ICMS_ST',
        imageUrl: null
      }
    ]);
    const codes = report.issues.filter((i) => i.productId === '2').map((i) => i.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'NCM_INVALID',
        'SKU_DUPLICATED',
        'BARCODE_DUPLICATED',
        'NEGATIVE_MARGIN',
        'NEGATIVE_STOCK',
        'CEST_REQUIRED_ST',
        'IMAGE_MISSING'
      ])
    );
    expect(report.productsWithErrors).toBe(2); // duplicidades afetam os dois produtos
    expect(report.fields.find((f) => f.field === 'imageUrl')?.percent).toBe(50);
  });
});
