import { useEffect, useMemo, useState } from 'react';
import { TbCopy, TbEye, TbEyeOff, TbSparkles } from 'react-icons/tb';

import { Button } from '../../components/atoms/Button';
import { Modal } from '../../components/atoms/Modal';
import { VITE_MCP_URL } from '../../constants/api.constants';
import { usePageTitle } from '../../hooks/use.page-title';
import {
  createMcpToken,
  getMcpTokenStatus,
  revokeMcpToken,
  type McpTokenStatus,
} from '../../services/mcp.service';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import './McpTokenPage.scss';

const EMPTY_TOKEN_STATUS: McpTokenStatus = {
  hasToken: false,
  createdAt: null,
  expiresAt: null,
  lastUsedAt: null,
};

const TOKEN_PLACEHOLDER = 'TU_TOKEN_AQUI';
const MCP_TOKEN_STORAGE_KEY = 'blister:mcp-token';

interface StoredMcpToken {
  token: string;
  createdAt: string;
}

const readStoredMcpToken = (): StoredMcpToken | null => {
  if (typeof window === 'undefined') return null;

  try {
    const rawValue = window.sessionStorage.getItem(MCP_TOKEN_STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<StoredMcpToken>;
    if (typeof parsed.token !== 'string' || typeof parsed.createdAt !== 'string') {
      return null;
    }

    return {
      token: parsed.token,
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
};

const writeStoredMcpToken = (token: string, createdAt: string): void => {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(MCP_TOKEN_STORAGE_KEY, JSON.stringify({ token, createdAt }));
};

const clearStoredMcpToken = (): void => {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(MCP_TOKEN_STORAGE_KEY);
};

const buildConfigSnippet = (token: string): string =>
  JSON.stringify(
    {
      mcpServers: {
        blister: {
          type: 'streamable-http',
          url: VITE_MCP_URL,
          headers: {
            Authorization: `Bearer ${token || TOKEN_PLACEHOLDER}`,
          },
        },
      },
    },
    null,
    2,
  );

const formatMcpDate = (value: string | null): string => {
  if (!value) {
    return 'No disponible';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

function McpTokenPage() {
  usePageTitle('Vincular Asistente de IA (MCP)');
  const addToast = useUiStore((s) => s.addToast);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<McpTokenStatus>(EMPTY_TOKEN_STATUS);
  const [showToken, setShowToken] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void getMcpTokenStatus()
      .then((status) => {
        if (isMounted) {
          setTokenStatus(status);

          const storedToken = readStoredMcpToken();
          if (status.hasToken && storedToken && storedToken.createdAt === status.createdAt) {
            setGeneratedToken(storedToken.token);
          } else {
            clearStoredMcpToken();
            setGeneratedToken(null);
            setShowToken(false);
          }
        }
      })
      .catch((err: unknown) => {
        const message = isApiError(err) ? err.message : 'No se ha podido cargar el estado MCP.';
        addToast({ message, variant: 'error' });
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStatus(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const configSnippet = useMemo(
    () => buildConfigSnippet(''),
    [],
  );

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      const result = await createMcpToken();
      setGeneratedToken(result.token);
      writeStoredMcpToken(result.token, result.createdAt);
      setTokenStatus({
        hasToken: result.hasToken,
        createdAt: result.createdAt,
        expiresAt: result.expiresAt,
        lastUsedAt: result.lastUsedAt,
      });
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
      clearStoredMcpToken();
      setGeneratedToken(null);
      setTokenStatus(EMPTY_TOKEN_STATUS);
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

  const tokenDisplay = generatedToken
    ? showToken
      ? generatedToken
      : '*'.repeat(14)
    : tokenStatus.hasToken
      ? 'Token activo'
      : 'Sin token activo';

  return (
    <section className="c-mcp-token-page" aria-label="Configuración del token MCP">
      <div className="c-mcp-token-page__sparkle" aria-hidden="true">
        <TbSparkles />
      </div>

      <h2 className="c-mcp-token-page__heading">¿Qué es esto?</h2>
      <p className="c-mcp-token-page__paragraph">
        Autoriza a asistentes como Claude o ChatGPT para consultar tu botiquín,
        registrar tomas y revisar avisos usando los permisos de tus blísters.
      </p>

      <div
        className={[
          'c-mcp-token-page__status',
          tokenStatus.hasToken && 'c-mcp-token-page__status--active',
        ].filter(Boolean).join(' ')}
      >
        <span className="c-mcp-token-page__status-label">Estado</span>
        <strong className="c-mcp-token-page__status-value">
          {isLoadingStatus ? 'Comprobando...' : tokenStatus.hasToken ? 'Activo' : 'Sin vincular'}
        </strong>
        {tokenStatus.hasToken ? (
          <dl className="c-mcp-token-page__status-details">
            <div>
              <dt>Generado</dt>
              <dd>{formatMcpDate(tokenStatus.createdAt)}</dd>
            </div>
            <div>
              <dt>Caduca</dt>
              <dd>{formatMcpDate(tokenStatus.expiresAt)}</dd>
            </div>
            <div>
              <dt>Último uso</dt>
              <dd>{formatMcpDate(tokenStatus.lastUsedAt)}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="c-mcp-token-page__field">
        <p className="c-mcp-token-page__field-label">URL</p>
        <div className="c-mcp-token-page__pill">
          <span className="c-mcp-token-page__pill-text">{VITE_MCP_URL}</span>
          <button
            type="button"
            className="c-mcp-token-page__pill-action"
            aria-label="Copiar URL"
            onClick={() => void handleCopy(VITE_MCP_URL, 'URL')}
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
            onClick={() => setShowToken((value) => !value)}
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
          {isGenerating ? 'Generando...' : tokenStatus.hasToken ? 'Regenerar token' : 'Generar token MCP'}
        </button>
        <p className="c-mcp-token-page__hint">
          El token se conserva mientras no cierres la sesión del navegador. Si ya no lo tienes, genera uno nuevo.
        </p>
      </div>

      <h2 className="c-mcp-token-page__heading">Configuración</h2>
      <ol className="c-mcp-token-page__steps">
        <li><strong>Copia el token</strong> cuando lo generes.</li>
        <li><strong>Abre la configuración de tu asistente</strong>.</li>
        <li><strong>Pega este bloque</strong> en la sección MCP remoto.</li>
      </ol>

      <div className="c-mcp-token-page__snippet">
        <pre className="c-mcp-token-page__snippet-code">
          <code>{configSnippet}</code>
        </pre>
        <button
          type="button"
          className="c-mcp-token-page__snippet-copy"
          aria-label="Copiar configuración"
          onClick={() => void handleCopy(configSnippet, 'Configuración')}
        >
          <TbCopy aria-hidden="true" />
        </button>
      </div>

      <h2 className="c-mcp-token-page__heading">Seguridad y accesos</h2>
      <p className="c-mcp-token-page__paragraph">
        El asistente hereda tus permisos por blíster. Los observadores solo pueden consultar,
        y los propietarios o cuidadores pueden registrar tomas o ajustar stock.
      </p>

      <button
        type="button"
        className="c-mcp-token-page__revoke"
        onClick={() => setShowRevokeModal(true)}
        disabled={isRevoking || !tokenStatus.hasToken}
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
