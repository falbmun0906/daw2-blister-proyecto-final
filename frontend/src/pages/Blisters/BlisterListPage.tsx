import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TbChevronDown,
  TbChevronUp,
  TbCopy,
  TbEye,
  TbHeart,
  TbHome,
  TbPencil,
  TbPlus,
  TbUser,
} from 'react-icons/tb';
import { FaBriefcaseMedical, FaCapsules } from 'react-icons/fa6';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Modal } from '../../components/atoms/Modal';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ROUTES } from '../../constants/routes';
import { useBlisters } from '../../hooks/use.blisters';
import { usePageTitle } from '../../hooks/use.page-title';
import {
  createBlister,
  createInvite,
  joinBlister,
  listBlisterMembers,
  removeBlisterMember,
  softDeleteBlister,
  updateBlister,
  updateBlisterMemberRole,
} from '../../services/blisters.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type {
  Blister,
  BlisterMemberDetail,
  BlisterRole,
} from '../../types/blister.types';
import './BlisterListPage.scss';

const ROLE_LABEL: Record<BlisterRole, string> = {
  OWNER: 'Propietario',
  CAREGIVER: 'Cuidador',
  OBSERVER: 'Observador',
};

const ROLE_LABEL_FEMALE: Record<BlisterRole, string> = {
  OWNER: 'Propietaria',
  CAREGIVER: 'Cuidadora',
  OBSERVER: 'Observadora',
};

function formatRole(role: BlisterRole, fullName: string): string {
  // Heurística simple por terminación. Se documenta como aproximación
  // estética, no como inferencia de género real.
  const last = fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return last.endsWith('a') ? ROLE_LABEL_FEMALE[role] : ROLE_LABEL[role];
}

function ListSkeleton() {
  return (
    <div aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Skeleton variant="rect" height="9rem" />
      <Skeleton variant="rect" height="9rem" />
      <Skeleton variant="rect" height="9rem" />
    </div>
  );
}

interface MemberStackProps {
  members: BlisterMemberDetail[];
}

/** Avatares solapados con +N de exceso. */
function MemberStack({ members }: MemberStackProps) {
  if (members.length === 0) return null;
  const visible = members.slice(0, 2);
  const extra = members.length - visible.length;
  return (
    <div className="c-blister-card__stack" aria-hidden="true">
      {visible.map((m) => (
        <Avatar key={m.userId} name={m.fullName} avatarKey={m.avatarKey ?? undefined} size="sm" />
      ))}
      {extra > 0 ? <span className="c-blister-card__stack-extra">+{extra}</span> : null}
    </div>
  );
}

// ── Modales locales (específicos de esta página) ───────────────────────────

interface MemberRoleModalProps {
  open: boolean;
  member: BlisterMemberDetail | null;
  onClose: () => void;
  onChangeRole: (role: BlisterRole) => Promise<void>;
  onDelete: () => void;
}

function MemberRoleModal({ open, member, onClose, onChangeRole, onDelete }: MemberRoleModalProps) {
  const [role, setRole] = useState<BlisterRole>(member?.role ?? 'OBSERVER');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) setRole(member.role);
  }, [member]);

  if (!member) return null;

  return (
    <Modal open={open} onClose={onClose} hideHeader ariaLabel={`Editar rol de ${member.fullName}`}>
      <header className="c-member-role-modal__header">
        <Avatar name={member.fullName} avatarKey={member.avatarKey ?? undefined} size="md" />
        <div className="c-member-role-modal__heading">
          <p className="c-member-role-modal__name">{member.fullName}</p>
          <p className="c-member-role-modal__current-role">{formatRole(member.role, member.fullName)}</p>
        </div>
        <button type="button" className="c-modal__close" onClick={onClose} aria-label="Cerrar">×</button>
      </header>
      <hr className="c-member-role-modal__rule" />
      <p className="c-member-role-modal__legend">Cambiar rol del miembro</p>
      <div className="c-member-role-modal__roles">
        {(['OWNER', 'OBSERVER', 'CAREGIVER'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`c-pill-btn${role === value ? ' is-active' : ''}`}
            onClick={() => setRole(value)}
          >
            {value === 'OWNER' ? <TbUser aria-hidden="true" /> : null}
            {value === 'OBSERVER' ? <TbEye aria-hidden="true" /> : null}
            {value === 'CAREGIVER' ? <TbHeart aria-hidden="true" /> : null}
            <span>{ROLE_LABEL[value]}</span>
          </button>
        ))}
      </div>
      <div className="c-member-role-modal__actions">
        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={saving}
          onClick={async () => {
            if (role === member.role) {
              onClose();
              return;
            }
            setSaving(true);
            try {
              await onChangeRole(role);
              onClose();
            } finally {
              setSaving(false);
            }
          }}
        >
          Guardar cambios
        </Button>
        <Button type="button" variant="danger" fullWidth onClick={onDelete}>
          Eliminar
        </Button>
      </div>
    </Modal>
  );
}

interface ConfirmRemoveModalProps {
  open: boolean;
  fullName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function ConfirmRemoveModal({ open, fullName, onClose, onConfirm }: ConfirmRemoveModalProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} hideHeader ariaLabel="Confirmar eliminación">
      <p className="c-confirm-modal__message">
        ¿Seguro que quieres eliminar a {fullName} y todos sus tratamientos activos?
      </p>
      <div className="c-confirm-modal__actions">
        <Button type="button" variant="primary-outline" onClick={onClose} disabled={busy}>
          Conservar
        </Button>
        <Button
          type="button"
          variant="danger"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          Sí, eliminar
        </Button>
      </div>
    </Modal>
  );
}

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  onCreateInvite: (role: BlisterRole) => Promise<string>;
}

function AddMemberModal({ open, onClose, onCreateInvite }: AddMemberModalProps) {
  const [role, setRole] = useState<BlisterRole>('OBSERVER');
  const [code, setCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  useEffect(() => {
    if (open) {
      setRole('OBSERVER');
      setCode(null);
    }
  }, [open]);

  const handleCopy = async () => {
    setGenerating(true);
    try {
      const generated = code ?? (await onCreateInvite(role));
      setCode(generated);
      await navigator.clipboard.writeText(generated);
      addToast({ message: `Código copiado: ${generated}`, variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido generar el código.',
        variant: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Añadir a un nuevo miembro">
      <p className="c-add-member-modal__legend">Selecciona el rol del nuevo miembro:</p>
      <div className="c-member-role-modal__roles">
        {(['OWNER', 'OBSERVER', 'CAREGIVER'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`c-pill-btn${role === value ? ' is-active' : ''}`}
            onClick={() => {
              setRole(value);
              setCode(null);
            }}
          >
            {value === 'OWNER' ? <TbUser aria-hidden="true" /> : null}
            {value === 'OBSERVER' ? <TbEye aria-hidden="true" /> : null}
            {value === 'CAREGIVER' ? <TbHeart aria-hidden="true" /> : null}
            <span>{ROLE_LABEL[value]}</span>
          </button>
        ))}
      </div>
      <p className="c-add-member-modal__help">
        Copia y comparte el código de invitación con la persona a la que quieres añadir.
      </p>
      <button
        type="button"
        className="c-dashed-btn"
        onClick={() => void handleCopy()}
        disabled={generating}
      >
        <span>{code ? `Código: ${code}` : 'Copiar código de invitación'}</span>
        <TbCopy aria-hidden="true" />
      </button>
    </Modal>
  );
}

interface NewBlisterModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

function NewBlisterModal({ open, onClose, onCreated }: NewBlisterModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const addToast = useUiStore((s) => s.addToast);

  useEffect(() => {
    if (open) {
      setName('');
      setCode('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim() && !code.trim()) {
      addToast({ message: 'Indica un nombre o un código de invitación.', variant: 'error' });
      return;
    }
    setBusy(true);
    try {
      if (code.trim()) {
        await joinBlister({ code: code.trim() });
        addToast({ message: 'Te has unido al blíster.', variant: 'success' });
      } else {
        await createBlister({ name: name.trim() });
        addToast({ message: 'Blíster creado.', variant: 'success' });
      }
      await onCreated();
      onClose();
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido completar la operación.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo blíster">
      <label className="c-new-blister-modal__label">
        <span>Elige un nombre para tu nuevo blíster:</span>
        <input
          type="text"
          className="c-pill-input"
          placeholder="Nombre del blíster"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <p className="c-new-blister-modal__or">o</p>
      <label className="c-new-blister-modal__label">
        <span>¡Únete con un código de invitación!</span>
        <input
          type="text"
          className="c-pill-input"
          placeholder="Código de invitación"
          value={code}
          maxLength={8}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
      </label>
      <Button type="button" variant="primary" loading={busy} onClick={() => void handleSubmit()}>
        Crear o unirme
      </Button>
    </Modal>
  );
}

// ── Card individual ────────────────────────────────────────────────────────

interface BlisterCardProps {
  blister: Blister;
  isOwner: boolean;
  onChanged: () => Promise<void>;
}

function BlisterCard({ blister, isOwner, onChanged }: BlisterCardProps) {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);
  const addToast = useUiStore((s) => s.addToast);

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(blister.name);
  const [members, setMembers] = useState<BlisterMemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [activeMember, setActiveMember] = useState<BlisterMemberDetail | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<BlisterMemberDetail | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    let cancelled = false;
    setLoadingMembers(true);
    listBlisterMembers(blister._id)
      .then((list) => {
        if (!cancelled) setMembers(list);
      })
      .catch((err) => {
        if (!cancelled) {
          addToast({
            message: isApiError(err) ? err.message : 'No se han podido cargar los miembros.',
            variant: 'error',
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMembers(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expanded, blister._id, addToast]);

  const owner = members.find((m) => m.role === 'OWNER');
  const ownerLabel = owner ? (owner.userId === userId ? 'Tú' : owner.fullName) : '—';

  const handleSelect = () => {
    const role = blister.members.find((m) => m.userId === userId)?.role ?? null;
    setActiveBlister(blister._id, role);
    navigate(ROUTES.home);
  };

  const handleSaveEdit = async () => {
    try {
      if (name.trim() && name.trim() !== blister.name) {
        await updateBlister(blister._id, { name: name.trim() });
      }
      addToast({ message: 'Cambios guardados.', variant: 'success' });
      setEditing(false);
      await onChanged();
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se han podido guardar los cambios.',
        variant: 'error',
      });
    }
  };

  const handleDiscard = () => {
    setName(blister.name);
    setEditing(false);
  };

  const handleDeleteBlister = async () => {
    if (!window.confirm(`¿Eliminar el blíster "${blister.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await softDeleteBlister(blister._id);
      addToast({ message: 'Blíster eliminado.', variant: 'success' });
      await onChanged();
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar.',
        variant: 'error',
      });
    }
  };

  const handleChangeRole = async (memberUserId: string, role: BlisterRole) => {
    await updateBlisterMemberRole(blister._id, memberUserId, { role });
    addToast({ message: 'Rol actualizado.', variant: 'success' });
    const list = await listBlisterMembers(blister._id);
    setMembers(list);
    await onChanged();
  };

  const handleRemoveMember = async (memberUserId: string) => {
    await removeBlisterMember(blister._id, memberUserId);
    addToast({ message: 'Miembro eliminado.', variant: 'success' });
    const list = await listBlisterMembers(blister._id);
    setMembers(list);
    await onChanged();
  };

  const handleCreateInvite = async (role: BlisterRole) => {
    const invite = await createInvite(blister._id, { role });
    return invite.code;
  };

  const stack = useMemo<BlisterMemberDetail[]>(
    () =>
      members.length > 0
        ? members
        : blister.members.map((m) => ({
            userId: m.userId,
            role: m.role,
            fullName: '',
            username: '',
            avatarKey: null,
          })),
    [members, blister.members],
  );

  return (
    <li className="c-blister-card">
      <button type="button" className="c-blister-card__open" onClick={handleSelect}>
        <span className="c-blister-card__icon" aria-hidden="true">
          <TbHome />
        </span>
        <span className="c-blister-card__heading">
          <span className="c-blister-card__title">{blister.name}</span>
          <span className="c-blister-card__owner">
            <TbUser aria-hidden="true" /> Propietario: {ownerLabel}
          </span>
        </span>
        <MemberStack members={stack} />
        {editing ? (
          <span className="c-blister-card__edit-mark" aria-hidden="true">
            <TbPencil />
          </span>
        ) : null}
      </button>

      <div className="c-blister-card__meta">
        <p>
          <FaBriefcaseMedical aria-hidden="true" />
          {blister.treatmentsCount ?? 0} tratamientos activos
        </p>
        <p>
          <FaCapsules aria-hidden="true" />
          {blister.medicinesCount ?? 0} medicamentos
        </p>
      </div>

      {expanded ? (
        <div className="c-blister-card__details">
          <p className="c-blister-card__details-title">Miembros</p>
          {loadingMembers ? (
            <Skeleton height="2rem" />
          ) : (
            <ul className="c-blister-card__members">
              {members.map((m) => {
                const isMe = m.userId === userId;
                return (
                  <li key={m.userId} className="c-blister-card__member">
                    <Avatar
                      name={m.fullName}
                      avatarKey={m.avatarKey ?? undefined}
                      size="sm"
                    />
                    <div className="c-blister-card__member-body">
                      <p className="c-blister-card__member-name">
                        {isMe ? 'Tú' : m.fullName}
                      </p>
                      <p className="c-blister-card__member-role">
                        {formatRole(m.role, m.fullName)}
                      </p>
                    </div>
                    {editing ? (
                      <button
                        type="button"
                        className="c-icon-btn"
                        aria-label={`Editar rol de ${m.fullName}`}
                        onClick={() => setActiveMember(m)}
                      >
                        <TbPencil aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {editing ? (
            <button
              type="button"
              className="c-dashed-btn"
              onClick={() => setShowAddMember(true)}
            >
              <span className="c-dashed-btn__plus" aria-hidden="true">
                <TbPlus />
              </span>
              <span>Añadir miembro</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <footer className="c-blister-card__footer">
        {expanded && editing ? (
          <div className="c-blister-card__edit-actions">
            <Button type="button" variant="primary" onClick={() => void handleSaveEdit()}>
              Guardar
            </Button>
            <Button type="button" variant="primary-outline" onClick={handleDiscard}>
              Descartar
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleDeleteBlister()}>
              Eliminar
            </Button>
          </div>
        ) : expanded && isOwner ? (
          <Button type="button" variant="primary-outline" onClick={() => setEditing(true)}>
            Editar
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        <button
          type="button"
          className="c-blister-card__toggle"
          onClick={() => {
            if (editing) handleDiscard();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded}
          aria-label={expanded ? 'Plegar tarjeta' : 'Desplegar tarjeta'}
        >
          {expanded ? <TbChevronUp aria-hidden="true" /> : <TbChevronDown aria-hidden="true" />}
        </button>
      </footer>

      <MemberRoleModal
        open={activeMember !== null}
        member={activeMember}
        onClose={() => setActiveMember(null)}
        onChangeRole={(role) => handleChangeRole(activeMember!.userId, role)}
        onDelete={() => {
          setConfirmRemove(activeMember);
          setActiveMember(null);
        }}
      />
      <ConfirmRemoveModal
        open={confirmRemove !== null}
        fullName={confirmRemove?.fullName ?? ''}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => handleRemoveMember(confirmRemove!.userId)}
      />
      <AddMemberModal
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        onCreateInvite={handleCreateInvite}
      />
    </li>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────

export default function BlisterListPage() {
  usePageTitle('Mis blísters');
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const { isLoading, error, refresh } = useBlisters();
  const blisters = useBlisterStore((s) => s.blisters);
  const [showNew, setShowNew] = useState(false);

  if (isLoading) return <ListSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;

  if (blisters.length === 0) {
    return (
      <>
        <EmptyState
          title="Todavía no tienes blísters"
          description="Crea uno nuevo o únete a uno existente con su código de invitación."
          ctaLabel="Crear blíster"
          onCtaClick={() => setShowNew(true)}
        />
        <NewBlisterModal
          open={showNew}
          onClose={() => setShowNew(false)}
          onCreated={() => refresh()}
        />
      </>
    );
  }

  return (
    <section className="c-blister-list" aria-labelledby="blisters-title">
      <ul className="c-blister-list__cards">
        {blisters.map((blister) => {
          const role = blister.members.find((m) => m.userId === userId)?.role ?? null;
          return (
            <BlisterCard
              key={blister._id}
              blister={blister}
              isOwner={role === 'OWNER'}
              onChanged={() => refresh()}
            />
          );
        })}
      </ul>

      <button
        type="button"
        className="c-dashed-btn c-blister-list__add"
        onClick={() => setShowNew(true)}
      >
        <span className="c-dashed-btn__plus" aria-hidden="true">
          <TbPlus />
        </span>
        <span>Nuevo blíster</span>
      </button>

      <NewBlisterModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={() => refresh()}
      />
    </section>
  );
}
