import { Product } from '../products/data-access/product.model';
import { Sale } from '../sales/data-access/sale.model';
import { salesTotal, saleUnits } from '../sales/sales.utils';

export function buildOverview(products: readonly Product[], sales: readonly Sale[]) {
  const quantities = new Map<number, number>();
  for (const sale of sales) {
    for (const detail of sale.details) {
      quantities.set(detail.product_id, (quantities.get(detail.product_id) ?? 0) + detail.quantity);
    }
  }
  const ranked = products.map((product) => ({
    ...product,
    unitsSold: quantities.get(product.id) ?? 0,
  }));
  const bySales = [...ranked].sort((a, b) => b.unitsSold - a.unitsSold || a.id - b.id);
  const byStock = [...ranked].sort((a, b) => a.stock - b.stock || a.id - b.id);
  return {
    revenue: salesTotal(sales),
    units: sales.reduce((sum, sale) => sum + saleUnits(sale), 0),
    stock: products.reduce((sum, product) => sum + product.stock, 0),
    top: bySales[0]?.unitsSold ? bySales[0] : null,
    least: [...ranked].sort((a, b) => a.unitsSold - b.unitsSold || a.id - b.id)[0] ?? null,
    lowestStock: byStock[0] ?? null,
    highestStock: [...byStock].sort((a, b) => b.stock - a.stock || a.id - b.id)[0] ?? null,
    bestSellers: bySales.filter((product) => product.unitsSold > 0).slice(0, 5),
    stockWatch: byStock.slice(0, 5),
    withoutSales: ranked.filter((product) => product.unitsSold === 0).length,
    recent: [...sales]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || b.id - a.id)
      .slice(0, 3),
  };
}
