import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { validateRegister } from '../../../domain/credentials';
import { registerFailure, type AuthField, type FieldMessage } from '../../../services/errors';
import { useFocusFirstInvalid } from '../hooks/useFocusFirstInvalid';
import { useSession } from '../state/session';
import { TextField } from './TextField';

export function RegisterForm() {
  const { t } = useTranslation();
  const { register } = useSession();
  const formRef = useRef<HTMLFormElement>(null);
  const focusFirstInvalid = useFocusFirstInvalid(formRef);
  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const text = (message: FieldMessage) => ('key' in message ? t(message.key) : message.text);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);
    const issues = validateRegister(values);
    const local: Partial<Record<AuthField, string>> = {};
    for (const field of ['name', 'email', 'password'] as const) {
      const code = issues[field];
      if (code) local[field] = t(`auth.validation.${field}.${code}`);
    }
    setErrors(local);
    if (Object.keys(local).length > 0) return focusFirstInvalid();

    setPending(true);
    try {
      const loggedIn = await register({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      if (!loggedIn) {
        setFormError('auth.register.createdNotLoggedIn');
        setPending(false);
      }
    } catch (error) {
      // The server is the authority: its field errors land on the matching fields.
      const failure = registerFailure(error);
      const remote: Partial<Record<AuthField, string>> = {};
      for (const [field, message] of Object.entries(failure.fields)) {
        remote[field as AuthField] = text(message);
      }
      setErrors(remote);
      setFormError(failure.formKey);
      setPending(false);
      focusFirstInvalid();
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={(event) => void submit(event)} className="stack">
      <TextField
        id="register-name"
        label={t('auth.fields.name')}
        autoComplete="name"
        value={values.name}
        onChange={(name) => setValues((v) => ({ ...v, name }))}
        error={errors.name}
      />
      <TextField
        id="register-email"
        label={t('auth.fields.email')}
        type="email"
        autoComplete="email"
        value={values.email}
        onChange={(email) => setValues((v) => ({ ...v, email }))}
        error={errors.email}
      />
      <TextField
        id="register-password"
        label={t('auth.fields.password')}
        type="password"
        autoComplete="new-password"
        value={values.password}
        onChange={(password) => setValues((v) => ({ ...v, password }))}
        hint={t('auth.fields.passwordHint')}
        error={errors.password}
      />
      {formError ? (
        <p role="alert" className="state state--error">
          {t(formError)}
        </p>
      ) : null}
      <button type="submit" className="button" disabled={pending} aria-busy={pending}>
        {pending ? t('auth.register.submitting') : t('auth.register.submit')}
      </button>
    </form>
  );
}
