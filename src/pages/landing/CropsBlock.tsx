import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { CROPS, TRAIT_KEYS, level } from './cropData';

const reveal = (index: number) => ({
  'data-reveal': '',
  style: { '--i': index } as CSSProperties,
});

/** The crops the tool compares, with a photo each, and a side-by-side comparison. */
export function CropsBlock() {
  const { t } = useTranslation();
  return (
    <div className="band__inner landing-crops">
      <div className="landing-crops__head">
        <h3 id="crops-title">{t('landing.crops.title')}</h3>
        <p>{t('landing.crops.intro')}</p>
      </div>

      <ul className="crop-cards">
        {CROPS.map((crop, index) => (
          <li key={crop.id} className="crop-card" {...reveal(index)}>
            <figure>
              <img src={crop.image} alt="" loading="lazy" width="640" height="480" />
              <figcaption>
                {t('landing.crops.photoCredit', { author: crop.author, license: crop.license })}
              </figcaption>
            </figure>
            <h4>{t(`landing.crops.items.${crop.id}.name`)}</h4>
            <p>{t(`landing.crops.items.${crop.id}.description`)}</p>
          </li>
        ))}
        <li className="crop-card crop-card--later" {...reveal(CROPS.length)}>
          <figure>
            <img src="/landing/cacao.jpg" alt="" loading="lazy" width="640" height="480" />
            <figcaption>{t('landing.crops.cacaoCredit')}</figcaption>
          </figure>
          <h4>{t('landing.crops.items.cacao.name')}</h4>
          <p>{t('landing.crops.items.cacao.description')}</p>
        </li>
      </ul>

      <div className="crop-compare" {...reveal(0)}>
        <h4 id="crop-compare-title">{t('landing.crops.compare.title')}</h4>
        <p className="crop-compare__note">{t('landing.crops.compare.note')}</p>
        <div className="crop-compare__scroll">
          <table aria-labelledby="crop-compare-title">
            <thead>
              <tr>
                <td />
                {CROPS.map((crop) => (
                  <th key={crop.id} scope="col">
                    <img src={crop.image} alt="" width="56" height="56" loading="lazy" />
                    <span>{t(`landing.crops.items.${crop.id}.name`)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TRAIT_KEYS.map((trait) => (
                <tr key={trait}>
                  <th scope="row">{t(`landing.crops.compare.traits.${trait}`)}</th>
                  {CROPS.map((crop) => {
                    const value = crop.traits[trait];
                    return (
                      <td key={crop.id} data-trait={trait}>
                        <span className="crop-bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(4, value * 100)}%` }} />
                        </span>
                        <span className="crop-level">
                          {t(`landing.crops.compare.levels.${level(value)}`)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="crop-compare__source">{t('landing.crops.compare.source')}</p>
      </div>
    </div>
  );
}
