import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { createMcpToken } from '../../services/mcp.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './McpTokenPage.scss';

function McpTokenPage() {
  usePageTitle('Token MCP');
  const navigate = useNavigate();
  const addToast = useUiStore((s) => s.addToast);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const result = await createMcpToken();
      setGeneratedToken(result.token);
      addToast({ message: 'Token generado. Cópialo ahora.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido generar el token.';
      addToast({ message, variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (): Promise<void> => {
    if (!generatedToken) return;
    try {
      await navigator.clipboard.writeText(generatedToken);
      addToast({ message: 'Token copiado al portapapeles.', variant: 'success' });
    } catch {
      addToast({ message: 'No se ha podido copiar.', variant: 'error' });
    }
  };

  const handleCloseModal = (): void => {
    setGeneratedToken(null);
    navigate(ROUTES.profile);
  };

  return (
    <section className="c-mcp-token-page" aria-labelledby="mcp-token-title">
      <header className="c-mcp-token-page__header">
        <h1 id="mcp-token-title" className="c-mcp-token-page__title">Token MCP</h1>
        <p className="c-mcp-token-page__description">
          El token MCP permite que agentes externos consulten tu información de Blíster.
          Solo se muestra una vez tras generarlo. Si lo pierdes, deberás revocar el actual y
          generar uno nuevo.
        </p>
      </header>

      <div className="c-mcp-token-page__actions">
        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={isGenerating}
          onClick={() => void handleGenerate()}
        >
          Generar nuevo token
        </Button>
        <Link to={ROUTES.mcpTokenRevoke} className="c-mcp-token-page__revoke-link">
          Revocar token actual
        </Link>
      </div>

      {generatedToken ? (
        <div
          className="c-mcp-token-page__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mcp-modal-title"
        >
          <div className="c-mcp-token-page__modal-card">
            <h2 id="mcp-modal-title" className="c-mcp-token-page__modal-title">
              Tu nuevo token MCP
            </h2>
            <p className="c-mcp-token-page__modal-warning">
              Cópialo ahora. No volveremos a mostrarlo.
            </p>
            <code className="c-mcp-token-page__token" aria-label="Token MCP en texto plano">
              {generatedToken}
            </code>
            <div className="c-mcp-token-page__modal-actions">
              <Button type="button" variant="primary-outline" onClick={() => void handleCopy()}>
                Copiar
              </Button>
              <Button type="button" variant="primary" onClick={handleCloseModal}>
                He guardado el token
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default McpTokenPage;
