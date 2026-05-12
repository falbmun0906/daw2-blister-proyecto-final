import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { revokeMcpToken } from '../../services/mcp.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';

function McpTokenRevokePage() {
  usePageTitle('Revocar token');
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async (): Promise<void> => {
    setIsRevoking(true);
    try {
      await revokeMcpToken();
      addToast({ message: 'Token revocado correctamente.', variant: 'success' });
      navigate(ROUTES.mcpToken);
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido revocar el token.';
      addToast({ message, variant: 'error' });
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <section className="c-mcp-token-revoke-page" aria-labelledby="mcp-revoke-title">
      <header className="c-mcp-token-revoke-page__header">
        <h1 id="mcp-revoke-title" className="c-mcp-token-revoke-page__title">
          Revocar token MCP
        </h1>
        <p className="c-mcp-token-revoke-page__description">
          Al revocar el token actual, los agentes externos perderán acceso de inmediato.
          Esta acción no se puede deshacer; deberás generar uno nuevo si lo necesitas.
        </p>
      </header>

      <div className="c-mcp-token-revoke-page__actions">
        <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.mcpToken)}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={isRevoking}
          onClick={() => void handleRevoke()}
        >
          Sí, revocar token
        </Button>
      </div>
    </section>
  );
}

export default McpTokenRevokePage;
