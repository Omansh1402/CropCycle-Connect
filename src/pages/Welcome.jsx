// src/pages/Welcome.jsx
// First-visit onboarding: three intro slides, then register / log in.
// Slides are a native scroll-snap strip, so swiping works on phones with no
// extra library. Auth is the demo module in src/lib/auth.js.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, SUPPORTED_LANGUAGES } from '../lib/i18n';
import { register, login, markOnboarded, isValidPhone } from '../lib/auth';
import { WELCOME_IMAGES } from '../lib/welcomeImages';
import Brand from '../components/Brand';
import './Welcome.css';

const SLIDE_COUNT = 4;
const AUTH_INDEX = 3;

const PHOTO_KEYS = ['photoField', 'photoMatching', 'photoReuse'];

/* ── Page ── */

export default function Welcome() {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useTranslation();

  const scrollerRef = useRef(null);
  const rafRef = useRef(0);
  const dotsRef = useRef(null);
  const [index, setIndex] = useState(0);

  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [form, setForm] = useState({ role: 'farmer', name: '', phone: '', district: '' });
  const [errors, setErrors] = useState({});

  // Glide to a slide. The index/dots update from the scroll position itself
  // (see onScroll), so they follow the motion instead of jumping ahead of it.
  const goTo = useCallback((i) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  // Drives the dot indicator every frame: --p is "how far along the strip",
  // --s is a 0..1 stretch that peaks halfway between two slides.
  const syncDots = (el) => {
    const dots = dotsRef.current;
    if (!dots || !el.clientWidth) return;
    const p = Math.min(Math.max(el.scrollLeft / el.clientWidth, 0), SLIDE_COUNT - 1);
    dots.style.setProperty('--p', p.toFixed(3));
    dots.style.setProperty('--s', Math.sin((p % 1) * Math.PI).toFixed(3));
  };

  const onScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollerRef.current;
      if (!el || !el.clientWidth) return;
      syncDots(el);
      const i = Math.min(Math.max(Math.round(el.scrollLeft / el.clientWidth), 0), SLIDE_COUNT - 1);
      setIndex((prev) => (prev === i ? prev : i));
    });
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  // Keep the current slide aligned when the window is resized or rotated.
  useEffect(() => {
    const realign = () => {
      const el = scrollerRef.current;
      if (el) el.scrollLeft = index * el.clientWidth;
    };
    window.addEventListener('resize', realign);
    return () => window.removeEventListener('resize', realign);
  }, [index]);

  const onKeyDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight' && index < SLIDE_COUNT - 1) goTo(index + 1);
    if (e.key === 'ArrowLeft' && index > 0) goTo(index - 1);
  };

  const setField = (name) => (e) => {
    setForm((prev) => ({ ...prev, [name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [name]: undefined, form: undefined }));
  };

  const switchMode = (next) => {
    setMode(next);
    setErrors({});
  };

  const finish = (user) => {
    markOnboarded();
    navigate(user?.role === 'buyer' ? '/buyer' : user ? '/farmer' : '/', { replace: true });
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (mode === 'register' && !form.name.trim()) next.name = t('welcome.error.name');
    if (!isValidPhone(form.phone)) next.phone = t('welcome.error.phone');
    if (mode === 'register' && !form.district.trim()) next.district = t('welcome.error.district');
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const result = mode === 'register' ? register(form) : login(form);
    if (!result.ok) {
      const messages = {
        exists: t('welcome.error.exists'),
        notFound: t('welcome.error.notFound'),
        storage: t('welcome.error.storage'),
      };
      setErrors({ form: messages[result.error] || t('welcome.error.storage') });
      return;
    }
    finish(result.user);
  };

  const guest = () => {
    markOnboarded();
    navigate('/', { replace: true });
  };

  const onAuthSlide = index === AUTH_INDEX;

  return (
    <div className="welcome" lang={language}>
      <header className="welcome__header">
        <div className="container welcome__header-inner">
          <div className="welcome__brand" aria-label={t('welcome.brand')}>
            <Brand />
          </div>
          <div className="welcome__header-actions">
            <select
              className="welcome__lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={t('welcome.language')}
            >
              {SUPPORTED_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.nativeLabel}</option>
              ))}
            </select>
            {!onAuthSlide && (
              <button type="button" className="welcome__skip" onClick={() => goTo(AUTH_INDEX)}>
              {t('welcome.skip')}
              </button>
            )}
          </div>
        </div>
      </header>

      <div
        className="welcome__scroller"
        ref={scrollerRef}
        onScroll={onScroll}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={t('welcome.brand')}
      >
        {PHOTO_KEYS.map((photoKey, i) => {
          const photo = WELCOME_IMAGES[i] || {};
          return (
            <section
              key={i}
              className="welcome__slide welcome__slide--photo"
              inert={index !== i}
              aria-label={`${i + 1} / ${SLIDE_COUNT}`}
            >
              {/* Background: the photo if one is set, otherwise a plain green block. */}
              <div className="welcome__bg" aria-hidden={photo.src ? undefined : 'true'}>
                {photo.src ? (
                  <img
                    className="welcome__bg-img"
                    src={photo.src}
                    alt={t(`welcome.${photoKey}`)}
                    style={{ objectPosition: photo.position || 'center' }}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    draggable={false}
                  />
                ) : (
                  <span className="welcome__photo-label">{t('welcome.photoPlaceholder')} {i + 1}</span>
                )}
              </div>
              <div className="welcome__slide-scroll">
                <div className="welcome__content">
                  <h1 className="welcome__title">{t(`welcome.slide${i + 1}.title`)}</h1>
                  <p className="welcome__body">{t(`welcome.slide${i + 1}.body`)}</p>
                </div>
              </div>
            </section>
          );
        })}

        <section
          className="welcome__slide"
          inert={index !== AUTH_INDEX}
          aria-label={`${SLIDE_COUNT} / ${SLIDE_COUNT}`}
        >
          <div className="welcome__content">
            <h1 className="welcome__title welcome__title--auth">{t('welcome.getStarted')}</h1>

            <div className="welcome__tabs" role="tablist">
              {['register', 'login'].map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  className={`welcome__tab ${mode === m ? 'is-active' : ''}`}
                  onClick={() => switchMode(m)}
                >
                  {m === 'register' ? t('welcome.register') : t('welcome.logIn')}
                </button>
              ))}
            </div>

            <form className="welcome__form" onSubmit={submit} noValidate>
              {mode === 'register' && (
                <fieldset className="welcome__roles">
                <legend className="form-label">{t('welcome.roleLabel')}</legend>
                  {['farmer', 'buyer'].map((r) => (
                    <label key={r} className={`welcome__role ${form.role === r ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={form.role === r}
                        onChange={setField('role')}
                      />
                      <span>{r === 'farmer' ? t('welcome.roleFarmer') : t('welcome.roleBuyer')}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="wl-name">{t('welcome.name')}</label>
                  <input
                    id="wl-name"
                    className={`form-control ${errors.name ? 'form-control--error' : ''}`}
                    value={form.name}
                    onChange={setField('name')}
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                  />
                  {errors.name && <span className="form-error" role="alert">{errors.name}</span>}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="wl-phone">{t('welcome.phone')}</label>
                <input
                  id="wl-phone"
                  className={`form-control ${errors.phone ? 'form-control--error' : ''}`}
                  value={form.phone}
                  onChange={setField('phone')}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                />
                {errors.phone && <span className="form-error" role="alert">{errors.phone}</span>}
                {mode === 'login' && !errors.phone && (
                  <span className="form-hint">{t('welcome.loginHint')}</span>
                )}
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="wl-district">{t('welcome.district')}</label>
                  <input
                    id="wl-district"
                    className={`form-control ${errors.district ? 'form-control--error' : ''}`}
                    value={form.district}
                    onChange={setField('district')}
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.district)}
                  />
                  {errors.district && <span className="form-error" role="alert">{errors.district}</span>}
                </div>
              )}

              {errors.form && <p className="form-error welcome__form-error" role="alert">{errors.form}</p>}

              <button type="submit" className="btn btn-primary btn-lg w-full">
                {mode === 'register' ? t('welcome.createAccount') : t('welcome.logIn')}
              </button>
              <button type="button" className="welcome__guest" onClick={guest}>
                {t('welcome.guest')}
              </button>
            </form>
          </div>
        </section>
      </div>

      <footer className="welcome__footer">
        <div className="welcome__dots" ref={dotsRef}>
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              className="welcome__dot"
              aria-label={`${t('welcome.goToSlide')} ${i + 1}`}
              aria-current={index === i}
              onClick={() => goTo(i)}
            />
          ))}
          <span className="welcome__dots-pill" aria-hidden="true" />
        </div>
        {!onAuthSlide && (
          <button type="button" className="btn btn-primary btn-lg welcome__next" onClick={() => goTo(index + 1)}>
            {t('welcome.next')}
          </button>
        )}
      </footer>
    </div>
  );
}
