import { useTranslation } from 'react-i18next';
import { PRIORITY_KEYS, toPercent, type RotationStrategy } from '../../../domain/strategies';

export function PriorityScores({ scores }: { scores: RotationStrategy['scores'] }) {
  const { t } = useTranslation();
  return (
    <ul className="priority-scores" aria-label={t('rotations.priorityScores')}>
      {PRIORITY_KEYS.map((key) => {
        const value = toPercent(scores[key]);
        return (
          <li key={key}>
            <span className="priority-name">{t(`rotations.priority.${key}`)}</span>{' '}
            <span className="priority-value">{t('rotations.outOf100', { value })}</span>
            <span className="priority-bar" aria-hidden="true">
              <span className="priority-fill" style={{ width: `${value}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
