// src/pages/Welcome.jsx
// First-visit onboarding: three intro slides, then register / log in.
// Slides are a native scroll-snap strip, so swiping works on phones with no
// extra library. Auth is the demo module in src/lib/auth.js.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, SUPPORTED_LANGUAGES } from '../lib/i18n';
import { getWelcomeText } from '../lib/welcomeStrings';
import { register, login, markOnboarded, isValidPhone } from '../lib/auth';
import './Welcome.css';

const SLIDE_COUNT = 4;
const AUTH_INDEX = 3;

const PHOTO_KEYS = ['photoField', 'photoMatching', 'photoReuse'];

/* ── Page ── */

export default function Welcome() {
  const navigate = useNavigate();
  const { language, setLanguage } = useTranslation();
  const text = getWelcomeText(language);

  const scrollerRef = useRef(null);
  const rafRef = useRef(0);
  const [index, setIndex] = useState(0);

  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [form, setForm] = useState({ role: 'farmer', name: '', phone: '', district: '' });
  const [errors, setErrors] = useState({});

  const goTo = useCallback((i) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'auto' });
    setIndex(i);
  }, []);

  const onScroll = () => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollerRef.current;
      if (!el || !el.clientWidth) return;
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
    if (mode === 'register' && !form.name.trim()) next.name = text.errName;
    if (!isValidPhone(form.phone)) next.phone = text.errPhone;
    if (mode === 'register' && !form.district.trim()) next.district = text.errDistrict;
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }

    const result = mode === 'register' ? register(form) : login(form);
    if (!result.ok) {
      const messages = { exists: text.errExists, notFound: text.errNotFound, storage: text.errStorage };
      setErrors({ form: messages[result.error] || text.errStorage });
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
        <div className="welcome__brand" aria-label={text.brand}>
          <div className="logo-symbol" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.477 2 2 6.477 2 12C2 14.83 3.177 17.388 5.07 19.21L6.48 17.79C4.94 16.32 4 14.27 4 12C4 7.58 7.58 4 12 4C16.42 4 20 7.58 20 12C20 14.27 19.06 16.32 17.52 17.79L18.93 19.21C20.823 17.388 22 14.83 22 12C22 6.477 17.523 2 12 2Z" fill="currentColor" />
              <path d="M12 7C9.239 7 7 9.239 7 12C7 13.43 7.6 14.72 8.56 15.63L9.97 14.22C9.37 13.66 9 12.87 9 12C9 10.34 10.34 9 12 9C13.66 9 15 10.34 15 12C15 12.87 14.63 13.66 14.03 14.22L15.44 15.63C16.4 14.72 17 13.43 17 12C17 9.239 14.761 7 12 7Z" fill="currentColor" opacity="0.8" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            </svg>
          </div>
          <div className="logo-text">
            <span className="logo-title">CropCycle</span>
            <span className="logo-badge">Connect</span>
          </div>
        </div>
        <div className="welcome__header-actions">
          <select
            className="welcome__lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Language"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.nativeLabel}</option>
            ))}
          </select>
          {!onAuthSlide && (
            <button type="button" className="welcome__skip" onClick={() => goTo(AUTH_INDEX)}>
              {text.skip}
            </button>
          )}
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
        aria-label={text.brand}
      >
        {PHOTO_KEYS.map((photoKey, i) => (
          <section
            key={i}
            className="welcome__slide"
            inert={index !== i}
            aria-label={`${i + 1} / ${SLIDE_COUNT}`}
          >
            <div className="welcome__content">
              <div className="welcome__art" role="img" aria-label={text[photoKey]}>
                <span className="welcome__photo-label">{text.photoPlaceholder}</span>
                <span className="welcome__photo-description">{text[photoKey]}</span>
              </div>
              <h1 className="welcome__title">{text[`slide${i + 1}Title`]}</h1>
              <p className="welcome__body">{text[`slide${i + 1}Body`]}</p>
            </div>
          </section>
        ))}

        <section
          className="welcome__slide"
          inert={index !== AUTH_INDEX}
          aria-label={`${SLIDE_COUNT} / ${SLIDE_COUNT}`}
        >
          <div className="welcome__content">
            <h1 className="welcome__title welcome__title--auth">{text.authTitle}</h1>

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
                  {m === 'register' ? text.tabRegister : text.tabLogin}
                </button>
              ))}
            </div>

            <form className="welcome__form" onSubmit={submit} noValidate>
              {mode === 'register' && (
                <fieldset className="welcome__roles">
                  <legend className="form-label">{text.roleLabel}</legend>
                  {['farmer', 'buyer'].map((r) => (
                    <label key={r} className={`welcome__role ${form.role === r ? 'is-active' : ''}`}>
                      <input
                        type="radio"
                        name="role"
                        value={r}
                        checked={form.role === r}
                        onChange={setField('role')}
                      />
                      <span>{r === 'farmer' ? text.roleFarmer : text.roleBuyer}</span>
                    </label>
                  ))}
                </fieldset>
              )}

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="wl-name">{text.name}</label>
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
                <label className="form-label" htmlFor="wl-phone">{text.phone}</label>
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
                  <span className="form-hint">{text.loginHint}</span>
                )}
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="wl-district">{text.district}</label>
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
                {mode === 'register' ? text.createAccount : text.logIn}
              </button>
              <button type="button" className="welcome__guest" onClick={guest}>
                {text.guest}
              </button>
            </form>
          </div>
        </section>
      </div>

      <footer className="welcome__footer">
        <div className="welcome__dots">
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`welcome__dot ${index === i ? 'is-active' : ''}`}
              aria-label={`${text.slideOf} ${i + 1}`}
              aria-current={index === i}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
        {!onAuthSlide && (
          <button type="button" className="btn btn-primary btn-lg welcome__next" onClick={() => goTo(index + 1)}>
            {text.next}
          </button>
        )}
      </footer>
    </div>
  );
}
