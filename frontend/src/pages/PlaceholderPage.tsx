import { usePageTitle } from '../hooks/use.page-title';

export function PlaceholderPage() {
  usePageTitle('BLÍSTER');
  return (
    <main>
      <p>Próximamente</p>
    </main>
  );
}