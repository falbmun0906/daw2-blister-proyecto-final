import { createElement, useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  TbChevronDown,
  TbChevronUp,
  TbCopy,
  TbEye,
  TbHeart,
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
import { BLISTER_AVATAR_KEYS, type BlisterAvatarKey, getBlisterIcon } from '../../constants/blister-avatars';
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
import { createBlisterSchema, joinBlisterSchema } from '../../../../shared/schemas/blister.schema';

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

const ROLE_DESCRIPTION: Record<BlisterRole, string> = {
  OWNER: 'Puede editar el blíster, gestionar miembros, medicamentos, tratamientos, citas e invitaciones.',
  CAREGIVER: 'Puede gestionar contenido y registrar tomas, pero no cambia la propiedad ni elimina el blíster.',
  OBSERVER: 'Puede consultar la información del blíster, sin editar contenido ni gestionar miembros.',
};

function formatRole(role: BlisterRole, fullName: string): string {
  // Heurística simple por terminación. Se documenta como aproximación
  // estética, no como inferencia de género real.
  const last = fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
  return last.endsWith('a') ? ROLE_LABEL_FEMALE[role] : ROLE_LABEL[role];
}

function toBlisterAvatarKey(value: string | null | undefined): BlisterAvatarKey | null {
  return BLISTER_AVATAR_KEYS.includes(value as BlisterAvatarKey) ? (value as BlisterAvatarKey) : null;
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
    if (!member) return;
    const timeoutId = window.setTimeout(() => setRole(member.role), 0);
    return () => window.clearTimeout(timeoutId);
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
      <p className="c-member-role-modal__description">{ROLE_DESCRIPTION[role]}</p>
      <hr className="c-member-role-modal__rule" />
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
  message: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

function ConfirmRemoveModal({ open, message, onClose, onConfirm }: ConfirmRemoveModalProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} hideHeader ariaLabel="Confirmar eliminación">
      <p className="c-confirm-modal__message">{message}</p>
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

interface RenameBlisterModalProps {
  open: boolean;
  initialValue: string;
  onClose: () => void;
  onConfirm: (nextName: string) => void;
}

function RenameBlisterModal({
  open,
  initialValue,
  onClose,
  onConfirm,
}: RenameBlisterModalProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = error ? `${inputId}-error` : undefined;

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      setValue(initialValue);
      setError(null);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [initialValue, open]);

  const handleConfirm = (): void => {
    const parsed = createBlisterSchema.safeParse({ name: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisa el nombre del blíster.');
      return;
    }
    onConfirm(parsed.data.name);
  };

  return (
    <Modal open={open} onClose={onClose} title="Editar titulo del blister">
      <label className="c-new-blister-modal__label" htmlFor={inputId}>
        <span>Nuevo titulo</span>
        <input
          id={inputId}
          type="text"
          className="c-pill-input"
          value={value}
          maxLength={120}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          aria-errormessage={errorId}
        />
      </label>
      {error ? (
        <p id={errorId} className="c-field__error" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
      <div className="c-confirm-modal__actions">
        <Button type="button" variant="primary-outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" onClick={handleConfirm}>
          Guardar
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
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      setRole('OBSERVER');
      setCode(null);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  const handleCopy = async () => {
    setGenerating(true);
    try {
      let generated = code;
      if (!generated) {
        generated = await onCreateInvite(role);
        setCode(generated);
      }

      try {
        await navigator.clipboard.writeText(generated);
        addToast({ message: `Código copiado: ${generated}`, variant: 'success' });
      } catch {
        addToast({
          message: `Código generado: ${generated}. No se ha podido copiar automáticamente.`,
          variant: 'info',
        });
      }
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
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameInputId = useId();
  const codeInputId = useId();
  const nameErrorId = nameError ? `${nameInputId}-error` : undefined;
  const codeErrorId = codeError ? `${codeInputId}-error` : undefined;
  const addToast = useUiStore((s) => s.addToast);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => {
      setName('');
      setCode('');
      setNameError(null);
      setCodeError(null);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim();
    setNameError(null);
    setCodeError(null);

    if (!trimmedName && !trimmedCode) {
      setNameError('Indica un nombre para crear un blíster.');
      setCodeError('O introduce un código de invitación para unirte.');
      return;
    }

    const parsedCode = trimmedCode ? joinBlisterSchema.safeParse({ code: trimmedCode }) : null;
    if (parsedCode && !parsedCode.success) {
      setCodeError(parsedCode.error.issues[0]?.message ?? 'Revisa el código de invitación.');
      return;
    }

    const parsedName = !trimmedCode ? createBlisterSchema.safeParse({ name: trimmedName }) : null;
    if (parsedName && !parsedName.success) {
      setNameError(parsedName.error.issues[0]?.message ?? 'Revisa el nombre del blíster.');
      return;
    }

    setBusy(true);
    try {
      if (parsedCode?.success) {
        await joinBlister({ code: parsedCode.data.code });
        addToast({ message: 'Te has unido al blíster.', variant: 'success' });
      } else if (parsedName?.success) {
        await createBlister({ name: parsedName.data.name });
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
      <label className="c-new-blister-modal__label" htmlFor={nameInputId}>
        <span>Elige un nombre para tu nuevo blíster:</span>
        <input
          id={nameInputId}
          type="text"
          className="c-pill-input"
          placeholder="Nombre del blíster"
          value={name}
          maxLength={120}
          onChange={(e) => {
            setName(e.target.value);
            setNameError(null);
          }}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameErrorId}
          aria-errormessage={nameErrorId}
        />
      </label>
      {nameError ? (
        <p id={nameErrorId} className="c-field__error" role="status" aria-live="polite">
          {nameError}
        </p>
      ) : null}
      <p className="c-new-blister-modal__or">o</p>
      <label className="c-new-blister-modal__label" htmlFor={codeInputId}>
        <span>¡Únete con un código de invitación!</span>
        <input
          id={codeInputId}
          type="text"
          className="c-pill-input"
          placeholder="Código de invitación"
          value={code}
          maxLength={8}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setCodeError(null);
          }}
          aria-invalid={codeError ? true : undefined}
          aria-describedby={codeErrorId}
          aria-errormessage={codeErrorId}
        />
      </label>
      {codeError ? (
        <p id={codeErrorId} className="c-field__error" role="status" aria-live="polite">
          {codeError}
        </p>
      ) : null}
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
  editingBlisterId: string | null;
  onStartEditing: (blisterId: string) => void;
  onStopEditing: () => void;
  onChanged: () => Promise<void>;
}

function BlisterCard({
  blister,
  isOwner,
  editingBlisterId,
  onStartEditing,
  onStopEditing,
  onChanged,
}: BlisterCardProps) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const setActiveBlister = useBlisterStore((s) => s.setActiveBlister);
  const addToast = useUiStore((s) => s.addToast);

  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<BlisterMemberDetail[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [name, setName] = useState(blister.name);
  const [draftAvatarKey, setDraftAvatarKey] = useState<BlisterAvatarKey | null>(
    toBlisterAvatarKey(blister.avatarKey),
  );
  const [showRenameModal, setShowRenameModal] = useState(false);

  const [activeMember, setActiveMember] = useState<BlisterMemberDetail | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<BlisterMemberDetail | null>(null);
  const [confirmDeleteBlister, setConfirmDeleteBlister] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [inviteBaselineCount, setInviteBaselineCount] = useState<number | null>(null);
  const [inviteJoinedNotified, setInviteJoinedNotified] = useState(false);

  const editing = editingBlisterId === blister._id;
  const canStartEditing = editingBlisterId === null || editing;

  const refreshMembers = useCallback(async (): Promise<BlisterMemberDetail[]> => {
    setLoadingMembers(true);
    try {
      const list = await listBlisterMembers(blister._id);
      setMembers(list);
      return list;
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se han podido cargar los miembros.',
        variant: 'error',
      });
      return [];
    } finally {
      setLoadingMembers(false);
    }
  }, [addToast, blister._id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshMembers();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshMembers]);

  useEffect(() => {
    if (!editing) return;
    const timeoutId = window.setTimeout(() => setExpanded(true), 0);
    return () => window.clearTimeout(timeoutId);
  }, [editing]);

  useEffect(() => {
    if (editing) return;
    const timeoutId = window.setTimeout(() => {
      setName(blister.name);
      setDraftAvatarKey(toBlisterAvatarKey(blister.avatarKey));
      setShowRenameModal(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [blister.avatarKey, blister.name, editing]);

  useEffect(() => {
    if (!showAddMember) {
      const timeoutId = window.setTimeout(() => {
        setInviteBaselineCount(null);
        setInviteJoinedNotified(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    if (inviteBaselineCount === null || inviteJoinedNotified) return;

    const interval = window.setInterval(() => {
      void listBlisterMembers(blister._id)
        .then(async (list) => {
          if (list.length <= inviteBaselineCount) return;
          setMembers(list);
          setInviteJoinedNotified(true);
          addToast({ message: 'Nuevo miembro añadido al blíster.', variant: 'success' });
          await onChanged();
        })
        .catch(() => undefined);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [addToast, blister._id, inviteBaselineCount, inviteJoinedNotified, onChanged, showAddMember]);

  const owner = members.find((m) => m.role === 'OWNER');
  const ownerLabel = owner ? (owner.userId === userId ? 'Tú' : owner.fullName) : '—';

  const handleExpand = () => {
    const role = blister.members.find((m) => m.userId === userId)?.role ?? null;
    setActiveBlister(blister._id, role);
    setExpanded(true);
  };

  const handleSaveEdit = async () => {
    try {
      const payload: { name?: string; avatarKey?: BlisterAvatarKey | null } = {};
      const trimmedName = name.trim();

      if (trimmedName && trimmedName !== blister.name) {
        payload.name = trimmedName;
      }
      if (draftAvatarKey !== (blister.avatarKey ?? null)) {
        payload.avatarKey = draftAvatarKey;
      }

      if (Object.keys(payload).length > 0) {
        await updateBlister(blister._id, payload);
        addToast({ message: 'Cambios guardados.', variant: 'success' });
      }

      setShowRenameModal(false);
      onStopEditing();
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
    setDraftAvatarKey(toBlisterAvatarKey(blister.avatarKey));
    setShowRenameModal(false);
    onStopEditing();
  };

  const handleRenameConfirm = (nextName: string) => {
    setName(nextName);
    setShowRenameModal(false);
  };

  const handleDeleteBlister = async () => {
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
    setExpanded(true);
    await onChanged();
  };

  const handleRemoveMember = async (memberUserId: string) => {
    await removeBlisterMember(blister._id, memberUserId);
    addToast({ message: 'Miembro eliminado.', variant: 'success' });
    const list = await listBlisterMembers(blister._id);
    setMembers(list);
    setExpanded(true);
    await onChanged();
  };

  const handleCreateInvite = async (role: BlisterRole) => {
    const invite = await createInvite(blister._id, { role });
    setInviteBaselineCount(members.length);
    setInviteJoinedNotified(false);
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
    <li
      className="c-blister-card"
      role={!editing ? 'button' : undefined}
      tabIndex={!editing ? 0 : undefined}
      onClick={(event) => {
        if (editing) return;
        if ((event.target as HTMLElement).closest('button, a, input, textarea, select')) return;
        handleExpand();
      }}
      onKeyDown={(event) => {
        if (editing) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        handleExpand();
      }}
    >
      <div className="c-blister-card__row">
        <span className="c-blister-card__icon-wrapper">
          <span className="c-blister-card__icon" aria-hidden="true">
            {createElement(getBlisterIcon(draftAvatarKey))}
          </span>
          {editing ? (
            <button
              type="button"
              className="c-blister-card__avatar-edit"
              aria-label="Cambiar avatar del blíster"
              onClick={() => setShowAvatarPicker(true)}
            >
              <TbPencil aria-hidden="true" />
            </button>
          ) : null}
        </span>
        {editing ? (
          <div className="c-blister-card__open c-blister-card__open--editing">
            <span className="c-blister-card__heading">
              <span className="c-blister-card__title">{name}</span>
              <span className="c-blister-card__owner">
                <TbUser aria-hidden="true" /> Propietario: {ownerLabel}
              </span>
            </span>
            <button
              type="button"
              className="c-blister-card__edit-mark"
              aria-label="Editar título del blíster"
              onClick={() => setShowRenameModal(true)}
            >
              <TbPencil aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="c-blister-card__open">
            <span className="c-blister-card__heading">
              <span className="c-blister-card__title">{blister.name}</span>
              <span className="c-blister-card__owner">
                <TbUser aria-hidden="true" /> Propietario: {ownerLabel}
              </span>
            </span>
            {!expanded ? <MemberStack members={stack} /> : null}
          </div>
        )}
      </div>

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
            <Button type="button" variant="danger" onClick={() => setConfirmDeleteBlister(true)}>
              Eliminar
            </Button>
          </div>
        ) : expanded && isOwner ? (
          <Button
            type="button"
            variant="primary-outline"
            disabled={!canStartEditing}
            onClick={() => {
              onStartEditing(blister._id);
              setExpanded(true);
            }}
          >
            Editar
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        {!editing ? (
          <button
            type="button"
            className="c-blister-card__toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Plegar tarjeta' : 'Desplegar tarjeta'}
          >
            {expanded ? <TbChevronUp aria-hidden="true" /> : <TbChevronDown aria-hidden="true" />}
          </button>
        ) : null}
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
        message={`¿Seguro que quieres eliminar a ${confirmRemove?.fullName ?? ''} y todos sus tratamientos activos?`}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => handleRemoveMember(confirmRemove!.userId)}
      />
      <ConfirmRemoveModal
        open={confirmDeleteBlister}
        message={`¿Seguro que quieres eliminar el blíster '${blister.name}'? Esta acción borrará todos los medicamentos y tratamientos activos y no es reversible.`}
        onClose={() => setConfirmDeleteBlister(false)}
        onConfirm={handleDeleteBlister}
      />
      <AddMemberModal
        open={showAddMember}
        onClose={() => {
          setShowAddMember(false);
          setExpanded(true);
          void refreshMembers().then(() => onChanged());
        }}
        onCreateInvite={handleCreateInvite}
      />
      <Modal
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        title="Elegir avatar del blíster"
      >
        <div className="c-blister-avatar-picker" role="radiogroup" aria-label="Elegir avatar del blíster">
          {BLISTER_AVATAR_KEYS.map((avatarKey) => {
            const AvatarIcon = getBlisterIcon(avatarKey);
            const isSelected = draftAvatarKey === avatarKey;
            return (
              <button
                key={avatarKey}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`c-blister-avatar-picker__option${isSelected ? ' is-selected' : ''}`}
                onClick={() => {
                  setDraftAvatarKey(avatarKey);
                  setShowAvatarPicker(false);
                }}
              >
                <AvatarIcon aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </Modal>
      <RenameBlisterModal
        open={showRenameModal}
        initialValue={name}
        onClose={() => setShowRenameModal(false)}
        onConfirm={handleRenameConfirm}
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
  const [editingBlisterId, setEditingBlisterId] = useState<string | null>(null);

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
              editingBlisterId={editingBlisterId}
              onStartEditing={setEditingBlisterId}
              onStopEditing={() => setEditingBlisterId(null)}
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
