import { Sale } from './data-access/sale.model';

export function saleUnits(sale: Sale): number {
  return sale.details.reduce((total, detail) => total + detail.quantity, 0);
}

export function salesTotal(sales: readonly Sale[]): number {
  const cents = sales.reduce((sum, sale) => {
    const [whole, fraction = '00'] = sale.total.split('.');
    return sum + Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  }, 0);
  return cents / 100;
}
