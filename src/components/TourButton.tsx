import { useTranslation } from 'react-i18next';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export function startDemoTour(t: (key: string) => string) {
  if (typeof window === 'undefined') return;
  try {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      nextBtnText: t('tour.next'),
      prevBtnText: t('tour.prev'),
      doneBtnText: t('tour.done'),
      steps: [
        {
          element: '.app-sidebar',
          popover: {
            title: t('tour.step1Title'),
            description: t('tour.step1Desc'),
            side: 'right',
            align: 'start',
          },
        },
        {
          element: '.dashboard-page-heading',
          popover: {
            title: t('tour.step2Title'),
            description: t('tour.step2Desc'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '.farm-dashboard-card, .farm-summary',
          popover: {
            title: t('tour.step3Title'),
            description: t('tour.step3Desc'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '.overview-links',
          popover: {
            title: t('tour.step4Title'),
            description: t('tour.step4Desc'),
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '.theme-toggle',
          popover: {
            title: t('tour.step5Title'),
            description: t('tour.step5Desc'),
            side: 'bottom',
            align: 'end',
          },
        },
      ],
    });
    driverObj.drive();
  } catch (err) {
    console.warn('Demo tour could not start:', err);
  }
}

export function TourButton() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      className="header-action tour-button"
      onClick={() => startDemoTour(t)}
      aria-label={t('tour.startAria')}
      title={t('tour.startAria')}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="tour-button__icon"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
      <span>{t('tour.button')}</span>
    </button>
  );
}
