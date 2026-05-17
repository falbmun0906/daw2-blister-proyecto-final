import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '../../components/atoms/Button';
import { EmptyState } from '../../components/atoms/EmptyState';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ConfirmDialog } from '../../components/molecules/ConfirmDialog';
import { RoleBadge } from '../../components/molecules/RoleBadge';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import {
  listBlisterMembers,
  removeBlisterMember,
  updateBlisterMemberRole,
} from '../../services/blisters.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { useUiStore } from '../../stores/ui.store';
import { isApiError } from '../../types/api.types';
import type { BlisterMemberDetail, BlisterRole } from '../../types/blister.types';
import { blisterRoles } from '../../../../shared/schemas/schema.constants';

function MembersSkeleton() {
  return (
    <div className="c-home__skeleton" aria-busy="true">
      <Skeleton variant="rect" height="4rem" />
      <Skeleton variant="rect" height="4rem" />
      <Skeleton variant="rect" height="4rem" />
    </div>
  );
}

/** Gestiona miembros de un blíster. Cambios de rol y expulsiones requieren OWNER. */
export default function BlisterMembersPage() {
  usePageTitle('Miembros');
  const navigate = useNavigate();
  const { blisterId } = useParams<{ blisterId: string }>();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const removeBlister = useBlisterStore((s) => s.removeBlister);
  const addToast = useUiStore((s) => s.addToast);

  const blister = blisters.find((b) => b._id === blisterId) ?? null;
  const isOwner = activeRole === 'OWNER';

  const [members, setMembers] = useState<BlisterMemberDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmRemoveMember, setConfirmRemoveMember] = useState<BlisterMemberDetail | null>(null);

  const refresh = useCallback(async () => {
    if (!blisterId) return;
    setIsLoading(true);
    setError(null);
    try {
      const list = await listBlisterMembers(blisterId);
      setMembers(list);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se han podido cargar los miembros.');
    } finally {
      setIsLoading(false);
    }
  }, [blisterId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  const handleRoleChange = async (memberId: string, role: BlisterRole) => {
    if (!blisterId) return;
    setBusyId(memberId);
    try {
      const updated = await updateBlisterMemberRole(blisterId, memberId, { role });
      setMembers((current) => current.map((m) => (m.userId === memberId ? updated : m)));
      addToast({ message: 'Rol actualizado.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido actualizar el rol.',
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!blisterId) return;
    const isSelf = memberId === userId;
    setBusyId(memberId);
    try {
      await removeBlisterMember(blisterId, memberId);
      if (isSelf) {
        removeBlister(blisterId);
        addToast({ message: 'Has abandonado el blíster.', variant: 'success' });
        navigate(ROUTES.blisters);
        return;
      }
      setMembers((current) => current.filter((m) => m.userId !== memberId));
      addToast({ message: 'Miembro eliminado.', variant: 'success' });
    } catch (err) {
      addToast({
        message: isApiError(err) ? err.message : 'No se ha podido eliminar al miembro.',
        variant: 'error',
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!blisterId) {
    return <ErrorState message="No se ha indicado el blíster." />;
  }
  if (isLoading) return <MembersSkeleton />;
  if (error) return <ErrorState message={error} onRetry={() => void refresh()} />;
  if (members.length === 0) {
    return <EmptyState title="Sin miembros" description="Este blíster aún no tiene miembros." />;
  }

  return (
    <section aria-label={blister?.name ? `Miembros de ${blister.name}` : 'Miembros'}>
      <p className="c-home__subtitle" style={{ marginBottom: 'var(--space-4)' }}>
        {isOwner
          ? 'Como propietario, puedes cambiar roles o expulsar miembros.'
          : 'Solo el propietario puede modificar roles o eliminar miembros.'}
      </p>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-stack)' }}>
        {members.map((member) => {
          const initials = member.fullName
            .split(' ')
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
          const isSelf = member.userId === userId;
          const canEdit = isOwner && !isSelf;
          const canLeave = isSelf && !isOwner;
          return (
            <li key={member.userId} className="c-member-row">
              <span className="c-member-row__avatar" aria-hidden="true">
                {initials || '?'}
              </span>
              <div>
                <p className="c-member-row__name">
                  {member.fullName}
                  {isSelf ? ' (tú)' : ''}
                </p>
                <p className="c-member-row__handle">@{member.username}</p>
              </div>
              <div className="c-member-row__actions">
                {canEdit ? (
                  <label className="u-sr-only" htmlFor={`role-${member.userId}`}>
                    Cambiar rol de {member.fullName}
                  </label>
                ) : null}
                {canEdit ? (
                  <select
                    id={`role-${member.userId}`}
                    className="c-field__input"
                    value={member.role}
                    disabled={busyId === member.userId}
                    onChange={(event) =>
                      void handleRoleChange(member.userId, event.target.value as BlisterRole)
                    }
                  >
                    {blisterRoles.map((role) => (
                      <option key={role} value={role}>
                        {role === 'OWNER' ? 'Propietario' : role === 'CAREGIVER' ? 'Cuidador' : 'Observador'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <RoleBadge role={member.role} />
                )}
                {(canEdit || canLeave) ? (
                  <Button
                    type="button"
                    variant="danger"
                    loading={busyId === member.userId}
                    onClick={() => setConfirmRemoveMember(member)}
                  >
                    {isSelf ? 'Salir' : 'Expulsar'}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={confirmRemoveMember !== null}
        message={
          confirmRemoveMember?.userId === userId
            ? '¿Seguro que quieres abandonar este blíster?'
            : `¿Expulsar a ${confirmRemoveMember?.fullName ?? 'este miembro'} del blíster?`
        }
        onCancel={() => setConfirmRemoveMember(null)}
        onConfirm={async () => {
          if (confirmRemoveMember) await handleRemove(confirmRemoveMember.userId);
        }}
        ariaLabel="Confirmar eliminación de miembro"
        confirmLabel={confirmRemoveMember?.userId === userId ? 'Sí, salir' : 'Sí, expulsar'}
      />
    </section>
  );
}
