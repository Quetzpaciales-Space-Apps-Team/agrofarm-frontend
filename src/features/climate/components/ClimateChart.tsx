import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  buildClimateChart,
  summarizeClimate,
  type ChartDims,
  type ClimateRow,
} from '../../../domain/chart';
import { formatMonth, formatValue } from '../../../domain/months';
import { ensoCode, type EnsoCell } from '../../../domain/enso';

const DIMS: ChartDims = {
  width: 720,
  height: 340,
  margin: { top: 16, right: 60, bottom: 48, left: 60 },
};

export function ClimateChart({
  rows,
  enso = [],
  showEnso = false,
  showRange = true,
}: {
  rows: ClimateRow[];
  enso?: readonly EnsoCell[];
  showEnso?: boolean;
  /** Draw the coolest and warmest temperature lines as well as the average. */
  showRange?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const id = useId();
  const chart = buildClimateChart(rows, DIMS);
  const summary = summarizeClimate(rows);
  const first = rows[0]?.month ?? '';
  const last = rows[rows.length - 1]?.month ?? '';
  const { plot } = chart;
  const bottom = plot.top + plot.height;
  const step = Math.max(1, Math.ceil(rows.length / 12));

  const range = (extentValue: { min: number; max: number } | null, unit: string, digits: number) =>
    extentValue
      ? {
          min: formatValue(extentValue.min, unit, locale, digits),
          max: formatValue(extentValue.max, unit, locale, digits),
        }
      : { min: t('climate.noDataShort'), max: t('climate.noDataShort') };
  const rain = range(summary.rain, 'mm', 0);
  const temp = range(summary.temp, '°C', 1);

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${DIMS.width} ${DIMS.height}`}
      role="img"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-desc`}
    >
      <title id={`${id}-title`}>
        {t('climate.chart.title', {
          start: formatMonth(first, locale),
          end: formatMonth(last, locale),
        })}
      </title>
      <desc id={`${id}-desc`}>
        {t('climate.chart.description', {
          rainMin: rain.min,
          rainMax: rain.max,
          tempMin: temp.min,
          tempMax: temp.max,
        })}{' '}
        {t('climate.chart.gaps', { count: summary.monthsWithGaps })}
      </desc>
      <defs>
        <pattern
          id={`${id}-gap`}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line className="gap-pattern-line" x1="0" y1="0" x2="0" y2="6" />
        </pattern>
      </defs>

      {chart.rainTicks.map((tick) => (
        <g key={`r-${tick.value}`}>
          <line
            className="grid-line"
            x1={plot.left}
            x2={plot.left + plot.width}
            y1={tick.y}
            y2={tick.y}
          />
          <text x={plot.left - 6} y={tick.y + 4} textAnchor="end">
            {new Intl.NumberFormat(locale).format(tick.value)}
          </text>
        </g>
      ))}
      {chart.tempTicks.map((tick) => (
        <text key={`t-${tick.value}`} x={plot.left + plot.width + 6} y={tick.y + 4}>
          {new Intl.NumberFormat(locale).format(tick.value)}
        </text>
      ))}
      <line
        className="axis-line"
        x1={plot.left}
        x2={plot.left + plot.width}
        y1={bottom}
        y2={bottom}
      />
      <line className="axis-line" x1={plot.left} x2={plot.left} y1={plot.top} y2={bottom} />

      {showEnso && enso.length > 0 && rows.length > 0
        ? enso.map((cell, index) => {
            const bandWidth = plot.width / rows.length;
            const x = plot.left + bandWidth * index;
            return (
              <g key={`enso-${cell.month}`}>
                <rect
                  className={`enso-band enso-band--${cell.phase ?? 'none'}`}
                  x={x}
                  y={plot.top}
                  width={bandWidth}
                  height={plot.height}
                />
                {bandWidth >= 18 ? (
                  <text
                    className="enso-band-label"
                    x={x + bandWidth / 2}
                    y={plot.top + 11}
                    textAnchor="middle"
                  >
                    {ensoCode(cell.phase)}
                  </text>
                ) : null}
              </g>
            );
          })
        : null}

      {chart.gapBands.map((gap) => (
        <rect
          key={gap.month}
          className="gap-band"
          x={gap.x}
          y={plot.top}
          width={gap.width}
          height={plot.height}
          fill={`url(#${id}-gap)`}
        />
      ))}
      {chart.bars.map((bar) =>
        bar.height === null ? null : (
          <rect
            key={bar.month}
            className="bar"
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
          />
        ),
      )}
      {chart.lines
        .filter((line) => showRange || line.key === 'temperature_mean_c')
        .map((line) =>
          line.segments.map((segment, index) => {
            const d = segment
              .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            const cls = line.key.replace('temperature_', '').replace('_c', '');
            // A single isolated month has no line to draw: show it as a short dash.
            const single = segment.length === 1 ? segment[0] : null;
            return (
              <path
                key={`${line.key}-${index}`}
                className={`line line--${cls}`}
                d={single ? `M${single.x - 3} ${single.y} L${single.x + 3} ${single.y}` : d}
              />
            );
          }),
        )}
      {chart.centers.map((center, index) =>
        index % step === 0 ? (
          <text key={center.month} x={center.x} y={bottom + 16} textAnchor="middle">
            {formatMonth(center.month, locale, 'tick')}
          </text>
        ) : null,
      )}
      <text
        x={14}
        y={plot.top + plot.height / 2}
        textAnchor="middle"
        transform={`rotate(-90 14 ${plot.top + plot.height / 2})`}
      >
        {t('climate.axis.rain')}
      </text>
      <text
        x={DIMS.width - 14}
        y={plot.top + plot.height / 2}
        textAnchor="middle"
        transform={`rotate(90 ${DIMS.width - 14} ${plot.top + plot.height / 2})`}
      >
        {t('climate.axis.temp')}
      </text>
    </svg>
  );
}
