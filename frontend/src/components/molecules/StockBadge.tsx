import type { Medicine, StockLevel } from '../../types/medicine.types';

interface StockBadgeProps {
  stock: number;
  threshold: number;
  unit: Medicine['stockUnit'];
  className?: string;
}

const VARIANT_LABEL: Record<StockLevel, string> = {
  ok: 'Stock correcto',
  low: 'Stock bajo',
  critical: 'Stock crítico',
  empty: 'Sin stock',
};

/** Calcula el nivel de stock a partir de stock y threshold. */
export function getStockLevel(stock: number, threshold: number): StockLevel {
  if (stock <= 0) return 'empty';
  if (stock <= Math.max(1, Math.floor(threshold / 2))) return 'critical';
  if (stock <= threshold) return 'low';
  return 'ok';
}

export function StockBadge({ stock, threshold, unit, className }: StockBadgeProps) {
  const level = getStockLevel(stock, threshold);
  return (
    <span
      className={['c-stock-badge', `c-stock-badge--${level}`, className]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-label={`${VARIANT_LABEL[level]}: ${stock} ${unit}`}
    >
      <span className="c-stock-badge__value">{stock}</span>
      <span className="c-stock-badge__unit">{unit}</span>
    </span>
  );
}
