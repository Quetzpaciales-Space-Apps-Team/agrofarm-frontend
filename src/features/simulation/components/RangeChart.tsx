import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { formatValue } from '../../../domain/months';
import { bandLayout, scenarioAxis, type QuantileRange } from '../../../domain/scenario';

const WIDTH = 640;
const LEFT = 100;
const RIGHT = 20;
const ROW_HEIGHT = 56;
const TOP = 12;
const AXIS_HEIGHT = 36;

/** Baseline and scenario: the p10..p90 range as a band and the p50 as a mark. */
export function RangeChart({
  baseline,
  scenario,
  unit,
}: {
  baseline: QuantileRange;
  scenario: QuantileRange;
  unit: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const id = useId();
  const axis = scenarioAxis([baseline, scenario]);
  const plotWidth = WIDTH - LEFT - RIGHT;
  const rows = [
    { key: 'baseline', label: t('simulation.baseline'), range: baseline },
    { key: 'scenario', label: t('simulation.scenario'), range: scenario },
  ];
  const height = TOP + ROW_HEIGHT * rows.length + AXIS_HEIGHT;
  const { scale } = bandLayout(baseline, axis, LEFT, plotWidth);
  const fmt = (value: number) => formatValue(value, unit, locale, 1) ?? '';
  const description = rows
    .map((row) =>
      t('simulation.chart.row', {
        name: row.label,
        low: fmt(row.range.p10),
        mid: fmt(row.range.p50),
        high: fmt(row.range.p90),
      }),
    )
    .join(' ');

  return (
    <svg
      className="chart range-chart"
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
    >
      <title id={`${id}-title`}>{t('simulation.chart.title')}</title>
      <desc id={`${id}-desc`}>{description}</desc>
      {axis.ticks.map((tick) => (
        <g key={tick}>
          <line
            className={tick === 0 ? 'axis-line' : 'grid-line'}
            x1={scale(tick)}
            x2={scale(tick)}
            y1={TOP}
            y2={TOP + ROW_HEIGHT * rows.length}
          />
          <text x={scale(tick)} y={height - 16} textAnchor="middle">
            {new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' }).format(tick)}
          </text>
        </g>
      ))}
      <text x={LEFT + plotWidth / 2} y={height - 2} textAnchor="middle">
        {t('simulation.chart.axis', { unit })}
      </text>
      {rows.map((row, index) => {
        const layout = bandLayout(row.range, axis, LEFT, plotWidth);
        const y = TOP + index * ROW_HEIGHT;
        const middle = y + ROW_HEIGHT / 2;
        return (
          <g key={row.key}>
            <text x={LEFT - 8} y={middle + 4} textAnchor="end">
              {row.label}
            </text>
            <rect
              className={`range-band range-band--${row.key}`}
              x={layout.bandX}
              y={middle - 12}
              width={Math.max(2, layout.bandWidth)}
              height={24}
            />
            <line
              className="range-mark"
              x1={layout.p50X}
              x2={layout.p50X}
              y1={middle - 18}
              y2={middle + 18}
            />
            <circle className="range-dot" cx={layout.p50X} cy={middle} r={4} />
          </g>
        );
      })}
    </svg>
  );
}
