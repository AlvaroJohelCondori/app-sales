import { Product } from '../products/data-access/product.model';
import { CreateSaleResult } from '../sales/data-access/sale.model';

export const MAX_QUANTITY = 2147483647;
export const MAX_TOTAL_CENTS = 9999999999n;

export function priceCents(value: unknown): bigint | null {
  if (typeof value !== 'string' || !/^\d{1,16}\.\d{2}$/.test(value)) return null;
  const [whole, fraction] = value.split('.');
  return BigInt(whole) * 100n + BigInt(fraction);
}

export function productError(product: Product): string | null {
  if (!Number.isSafeInteger(product.id) || product.id < 1)
    return 'El identificador de este producto no es válido.';
  if (!Number.isSafeInteger(product.stock) || product.stock < 0)
    return 'No se pudo verificar el stock de este producto.';
  const cents = priceCents(product.price);
  if (cents === null) return 'No se pudo verificar el precio de este producto.';
  if (cents > MAX_TOTAL_CENTS)
    return 'El precio de este producto supera el límite permitido para una venta.';
  return null;
}

export function validateQuantity(value: string, product: Product): string | null {
  const invalidProduct = productError(product);
  if (invalidProduct) return invalidProduct;
  if (product.stock === 0)
    return 'Este producto ya no tiene stock disponible. Retíralo del carrito.';
  if (value.length === 0) return 'Ingresa una cantidad.';
  if (!/^\d+$/.test(value))
    return 'Usa un número entero positivo, sin decimales ni otros caracteres.';
  const quantity = Number(value);
  if (quantity < 1) return 'La cantidad mínima es 1.';
  if (!Number.isSafeInteger(quantity) || quantity > MAX_QUANTITY)
    return 'La cantidad máxima permitida es 2,147,483,647.';
  if (quantity > product.stock)
    return `La cantidad no puede superar el stock disponible (${product.stock.toLocaleString('es-BO')} unidades).`;
  return null;
}

export function isCreateSaleResult(value: unknown): value is CreateSaleResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<CreateSaleResult>;
  const cents = priceCents(result.total);
  return (
    typeof result.message === 'string' &&
    result.message.trim().length > 0 &&
    typeof result.sale_id === 'number' &&
    Number.isSafeInteger(result.sale_id) &&
    result.sale_id > 0 &&
    cents !== null &&
    cents <= MAX_TOTAL_CENTS
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
