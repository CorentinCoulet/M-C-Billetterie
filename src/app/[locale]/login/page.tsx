import { useTranslations } from 'next-intl';

export default function LoginPage() {
  const t = useTranslations('auth');

  return (
    <main>
      <h1>{t('login')}</h1>
      <form>
        <label>
          {t('email')}
          <input type="email" name="email" />
        </label>
        <label>
          {t('password')}
          <input type="password" name="password" />
        </label>
        <button type="submit">{t('login')}</button>
      </form>
    </main>
  );
}