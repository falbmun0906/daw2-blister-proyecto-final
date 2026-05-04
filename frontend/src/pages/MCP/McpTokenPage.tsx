import { useState } from 'react';
import { TbCopy, TbEye, TbEyeOff, TbSparkles } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { Modal } from '../../components/atoms/Modal';
import { VITE_API_URL } from '../../constants/api.constants';
import { usePageTitle } from '../../hooks/use.page-title';
import { createMcpToken, revokeMcpToken } from '../../services/mcp.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './McpTokenPage.scss';

const MCP_URL = `${VITE_API_URL}/mcp`;

const buildConfigSnippet = (token: string): string =>
  JSON.stringify(
    {
      mcpServers: {
        blister: {
          command: 'npx',
          args: ['@blister/mcp-server'],
          env: {
            BLISTER_API_URL: MCP_URL,
            BLISTER_ACCESS_TOKEN: token || 'TU_TOKEN_AQUÍ',
          },
        },
      },
    },
    null,
    2,
  );

function McpTokenPage() {
  usePageTitle('Vincular Asistente de IA (MCP)');
  const addToast = useUiStore((s) => s.addToast);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const result = await createMcpToken();
      setGeneratedToken(result.token);
      setShowToken(true);
      addToast({ message: 'Token generado. Cópialo ahora.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido generar el token.';
      addToast({ message, variant: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      addToast({ message: `${label} copiado al portapapeles.`, variant: 'success' });
    } catch {
      addToast({ message: 'No se ha podido copiar.', variant: 'error' });
    }
  };

  const handleRevoke = async (): Promise<void> => {
    setIsRevoking(true);
    try {
      await revokeMcpToken();
      setGeneratedToken(null);
      setShowToken(false);
      setShowRevokeModal(false);
      addToast({ message: 'Accesos revocados correctamente.', variant: 'success' });
    } catch (err) {
      const message = isApiError(err) ? err.message : 'No se ha podido revocar.';
      addToast({ message, variant: 'error' });
    } finally {
      setIsRevoking(false);
    }
  };

  const tokenDisplay = generatedToken ? (showToken ? generatedToken : '*'.repeat(14)) : '*'.repeat(14);

  return (
    <section className="c-mcp-token-page" aria-label="Configuración del token MCP">
      <div className="c-mcp-token-page__sparkle" aria-hidden="true">
        <TbSparkles />
      </div>

      <h2 className="c-mcp-token-page__heading">¿Qué es esto?</h2>
      <p className="c-mcp-token-page__paragraph">
        Autoriza a asistentes como Claude o ChatGPT para que puedan consultar tu botiquín,
        registrar tus tomas y avisarte de faltas de stock mediante lenguaje natural.
      </p>

      <div className="c-mcp-token-page__field">
        <p className="c-mcp-token-page__field-label">URL</p>
        <div className="c-mcp-token-page__pill">
          <span className="c-mcp-token-page__pill-text">{MCP_URL}</span>
          <button
            type="button"
            className="c-mcp-token-page__pill-action"
            aria-label="Copiar URL"
            onClick={() => void handleCopy(MCP_URL, 'URL')}
          >
            <TbCopy aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="c-mcp-token-page__field">
        <p className="c-mcp-token-page__field-label">Token</p>
        <div className="c-mcp-token-page__pill">
          <span className="c-mcp-token-page__pill-text c-mcp-token-page__pill-text--mono">
            {tokenDisplay}
          </span>
          <button
            type="button"
            className="c-mcp-token-page__pill-action"
            aria-label={showToken ? 'Ocultar token' : 'Mostrar token'}
            onClick={() => setShowToken((v) => !v)}
            disabled={!generatedToken}
          >
            {showToken ? <TbEyeOff aria-hidden="true" /> : <TbEye aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="c-mcp-token-page__pill-action"
            aria-label="Copiar token"
            onClick={() => generatedToken && void handleCopy(generatedToken, 'Token')}
            disabled={!generatedToken}
          >
            <TbCopy aria-hidden="true" />
          </button>
        </div>
        <button
          type="button"
          className="c-mcp-token-page__inline-link"
          onClick={() => void handleGenerate()}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generando…' : 'Generar nuevo Token'}
        </button>
        <p className="c-mcp-token-page__hint">
          No compartas este token. Da acceso total a tu información de salud a través de la IA.
        </p>
      </div>

      <h2 className="c-mcp-token-page__heading">Instrucciones de Configuración</h2>
      <ol className="c-mcp-token-page__steps">
        <li><strong>Copia la URL y el Token</strong> de arriba.</li>
        <li><strong>Abre la configuración de tu asistente</strong> (ej: Claude Desktop).</li>
        <li><strong>Pega la configuración</strong> que te facilitamos a continuación.</li>
      </ol>

      <div className="c-mcp-token-page__snippet">
        <pre className="c-mcp-token-page__snippet-code">
          <code>{buildConfigSnippet(generatedToken ?? '')}</code>
        </pre>
        <button
          type="button"
          className="c-mcp-token-page__snippet-copy"
          aria-label="Copiar configuración"
          onClick={() => void handleCopy(buildConfigSnippet(generatedToken ?? ''), 'Configuración')}
        >
          <TbCopy aria-hidden="true" />
        </button>
      </div>

      <h2 className="c-mcp-token-page__heading">Seguridad y accesos</h2>
      <p className="c-mcp-token-page__paragraph">
        Si has perdido el acceso a tu asistente o crees que tu token ha sido comprometido,
        puedes invalidar todos los accesos actuales. Esto desconectará Blíster de cualquier IA
        de forma inmediata.
      </p>

      <button
        type="button"
        className="c-mcp-token-page__revoke"
        onClick={() => setShowRevokeModal(true)}
      >
        Revocar todos los accesos
      </button>

      <Modal
        open={showRevokeModal}
        title="¿Revocar accesos de IA?"
        onClose={() => setShowRevokeModal(false)}
      >
        <p className="c-mcp-token-page__modal-description">
          Esta acción desconectará Blíster de Claude, ChatGPT y cualquier otro asistente
          vinculado. Tendrás que generar un nuevo token para volver a conectarlos.
        </p>
        <div className="c-mcp-token-page__modal-actions">
          <Button
            type="button"
            variant="primary-outline"
            onClick={() => setShowRevokeModal(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={isRevoking}
            onClick={() => void handleRevoke()}
          >
            Sí, revocar accesos
          </Button>
        </div>
      </Modal>
    </section>
  );
}

export default McpTokenPage;
