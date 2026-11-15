import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { validateLogin } from '../../../domain/credentials';
import { loginErrorKey } from '../../../services/errors';
import { useFocusFirstInvalid } from '../hooks/useFocusFirstInvalid';
import { useSession } from '../state/session';
import { TextField } from './TextField';

export function LoginForm() {
  const { t } = useTranslation();
  const { login } = useSession();
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<'email' | 'password', string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    const issues = validateLogin(values);
    const next = {
      email: issues.email && t(`auth.validation.email.${issues.email}`),
      password: issues.password && t(`auth.validation.password.${issues.password}`),
    };
    setFormError(null);
    setErrors({
      ...(next.email && { email: next.email }),
      ...(next.password && { password: next.password }),
    });
    if (next.email || next.password) return focusFirstInvalid();
    setPending(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
    } catch (error) {
      // One message for every credential problem: never say whether the email exists.
      setFormError(loginErrorKey(error));
      setPending(false);
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={(event) => void submit(event)} className="stack">
      <TextField
        id="login-email"
        label={t('auth.fields.email')}
        type="email"
        autoComplete="username"
        value={values.email}
        onChange={(email) => setValues((v) => ({ ...v, email }))}
        error={errors.email}
      />
      <TextField
        id="login-password"
        label={t('auth.fields.password')}
        type="password"
        autoComplete="current-password"
        value={values.password}
        onChange={(password) => setValues((v) => ({ ...v, password }))}
        error={errors.password}
      />
      {formError ? (
        <p role="alert" className="state state--error">
          {t(formError)}
        </p>
      ) : null}
      <button type="submit" className="button" disabled={pending} aria-busy={pending}>
        {pending ? t('auth.login.submitting') : t('auth.login.submit')}
      </button>
    </form>
  );
}
