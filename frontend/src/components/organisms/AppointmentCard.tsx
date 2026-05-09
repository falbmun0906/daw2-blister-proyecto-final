import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  TbCalendar,
  TbChevronDown,
  TbChevronUp,
  TbClock,
  TbDotsVertical,
  TbMapPin,
  TbMessageCircle,
  TbPencil,
  TbSend,
  TbStethoscope,
  TbTrash,
} from 'react-icons/tb';

import { ROUTES } from '../../constants/routes';
import type { Appointment } from '../../types/appointment.types';
import type { BlisterRole } from '../../types/blister.types';
import type { Treatment } from '../../types/treatment.types';
import { Avatar } from '../atoms/Avatar';
import { Button } from '../atoms/Button';

type AppointmentComment = Appointment['comments'][number];

interface AppointmentCardProps {
  appointment: Appointment;
  treatments: Treatment[];
  blisterId: string;
  userRole: BlisterRole | null;
  currentUserId: string | null;
  onDelete: (appointment: Appointment) => void;
  onAddComment: (appointment: Appointment, text: string) => Promise<void>;
  onUpdateComment: (
    appointment: Appointment,
    comment: AppointmentComment,
    text: string,
  ) => Promise<void>;
  onDeleteComment: (appointment: Appointment, comment: AppointmentComment) => Promise<void>;
}

interface CommentItemProps {
  appointment: Appointment;
  comment: AppointmentComment;
  editable: boolean;
  onUpdateComment: AppointmentCardProps['onUpdateComment'];
  onDeleteComment: AppointmentCardProps['onDeleteComment'];
}

const canMutate = (role: BlisterRole | null): boolean =>
  role === 'OWNER' || role === 'CAREGIVER';

const canEditComment = (
  comment: AppointmentComment,
  currentUserId: string | null,
  userRole: BlisterRole | null,
): boolean => currentUserId === comment.userId || userRole === 'OWNER';

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
});

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

const formatCommentsCount = (count: number): string =>
  `${count} ${count === 1 ? 'comentario' : 'comentarios'}`;

const hasCommentBeenEdited = (comment: AppointmentComment): boolean => {
  const createdAt = Date.parse(comment.createdAt);
  const updatedAt = Date.parse(comment.updatedAt);

  return Number.isFinite(createdAt) && Number.isFinite(updatedAt) && updatedAt > createdAt;
};

const buildMapsSearchHref = (location: string): string => {
  const query = encodeURIComponent(location);

  if (typeof navigator === 'undefined') {
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  }

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIos) {
    return `http://maps.apple.com/?q=${query}`;
  }

  if (/Android/i.test(navigator.userAgent)) {
    return `geo:0,0?q=${query}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

function CommentItem({
  appointment,
  comment,
  editable,
  onUpdateComment,
  onDeleteComment,
}: CommentItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.text);
  const [busy, setBusy] = useState(false);
  const isEdited = hasCommentBeenEdited(comment);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setBusy(true);
    try {
      await onUpdateComment(appointment, comment, text);
      setIsEditing(false);
      setMenuOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="c-appointment-card__comment">
      <Avatar name={comment.authorName} avatarKey={comment.authorAvatarKey ?? undefined} size="sm" />
      <div className="c-appointment-card__comment-body">
        <p className="c-appointment-card__comment-author">{comment.authorName}</p>
        {isEditing ? (
          <form className="c-appointment-card__comment-edit" onSubmit={(event) => void handleSubmit(event)}>
            <textarea
              className="c-field__textarea"
              value={draft}
              rows={3}
              maxLength={500}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className="c-appointment-card__comment-edit-actions">
              <Button type="button" variant="primary-outline" onClick={() => setIsEditing(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" loading={busy}>
                Guardar
              </Button>
            </div>
          </form>
        ) : (
          <p className="c-appointment-card__comment-text">
            <span>{comment.text}</span>
            {isEdited ? <span className="c-appointment-card__comment-edited">(editado)</span> : null}
          </p>
        )}
      </div>
      {editable ? (
        <div className="c-appointment-card__menu">
          <button
            type="button"
            className="c-appointment-card__menu-toggle"
            aria-label="Acciones del comentario"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <TbDotsVertical aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="c-appointment-card__menu-popover" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsEditing(true);
                  setMenuOpen(false);
                }}
              >
                <TbPencil aria-hidden="true" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  void onDeleteComment(appointment, comment);
                }}
              >
                <TbTrash aria-hidden="true" />
                <span>Eliminar</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** Tarjeta de cita con metadatos, acciones y comentarios. */
export function AppointmentCard({
  appointment,
  treatments,
  blisterId,
  userRole,
  currentUserId,
  onDelete,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: AppointmentCardProps) {
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const editable = canMutate(userRole);
  const linkedTreatment = appointment.treatmentId
    ? treatments.find((t) => t.id === appointment.treatmentId)
    : null;
  const treatmentLabel = linkedTreatment?.title ?? 'Sin tratamiento vinculado';
  const location = appointment.location?.trim() || '';
  const mapsHref = location ? buildMapsSearchHref(location) : null;
  const appointmentDate = new Date(appointment.date);
  const detailsId = `appointment-card-details-${appointment.id}`;
  const canSubmitComment = commentText.trim().length > 0 && !commentBusy;
  const commentsCountLabel = formatCommentsCount(appointment.comments.length);

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setCommentBusy(true);
    try {
      await onAddComment(appointment, text);
      setCommentText('');
    } finally {
      setCommentBusy(false);
    }
  };

  return (
    <article className="c-appointment-card" aria-label={appointment.title}>
      <header className="c-appointment-card__header">
        <div className="c-appointment-card__heading">
          <h3 className="c-appointment-card__title">{appointment.title}</h3>
          <p className="c-appointment-card__treatment">
            <TbStethoscope aria-hidden="true" />
            <span>{treatmentLabel}</span>
          </p>
        </div>
        <div className="c-appointment-card__actions">
          {editable ? (
            <div className="c-appointment-card__menu">
              <button
                type="button"
                className="c-appointment-card__menu-toggle"
                aria-label="Acciones de la cita"
                aria-expanded={cardMenuOpen}
                onClick={() => setCardMenuOpen((open) => !open)}
              >
                <TbDotsVertical aria-hidden="true" />
              </button>
              {cardMenuOpen ? (
                <div className="c-appointment-card__menu-popover" role="menu">
                  <Link
                    to={ROUTES.editAppointment(blisterId, appointment.id)}
                    role="menuitem"
                    onClick={() => setCardMenuOpen(false)}
                  >
                    <TbPencil aria-hidden="true" />
                    <span>Editar</span>
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setCardMenuOpen(false);
                      onDelete(appointment);
                    }}
                  >
                    <TbTrash aria-hidden="true" />
                    <span>Eliminar</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <dl className="c-appointment-card__meta">
        <div className="c-appointment-card__meta-item">
          <dt><TbCalendar aria-hidden="true" /><span>Fecha</span></dt>
          <dd><time dateTime={appointment.date}>{dateFormatter.format(appointmentDate)}</time></dd>
        </div>
        <div className="c-appointment-card__meta-item">
          <dt><TbClock aria-hidden="true" /><span>Hora</span></dt>
          <dd><time dateTime={appointment.date}>{timeFormatter.format(appointmentDate)}</time></dd>
        </div>
        <div className="c-appointment-card__meta-item">
          <dt><TbMapPin aria-hidden="true" /><span>Lugar</span></dt>
          <dd>
            {mapsHref ? (
              <a
                className="c-appointment-card__location-link"
                href={mapsHref}
                aria-label={`Abrir ubicación en mapas: ${location}`}
              >
                {location}
              </a>
            ) : 'Lugar pendiente'}
          </dd>
        </div>
      </dl>

      {expanded ? (
        <div id={detailsId} className="c-appointment-card__details">
          {appointment.description ? (
            <section className="c-appointment-card__description" aria-label="Descripción">
              <h4>Descripción</h4>
              <p>{appointment.description}</p>
            </section>
          ) : null}

          <section className="c-appointment-card__comments" aria-label="Comentarios">
            <h4 className="c-appointment-card__comments-title">
              <TbMessageCircle aria-hidden="true" />
              <span>Comentarios</span>
            </h4>
            {appointment.comments.length > 0 ? (
              <ul className="c-appointment-card__comment-list">
                {appointment.comments.map((comment: AppointmentComment) => (
                  <CommentItem
                    key={comment.id}
                    appointment={appointment}
                    comment={comment}
                    editable={editable && canEditComment(comment, currentUserId, userRole)}
                    onUpdateComment={onUpdateComment}
                    onDeleteComment={onDeleteComment}
                  />
                ))}
              </ul>
            ) : (
              <p className="c-appointment-card__comments-empty">Aún no hay comentarios</p>
            )}
            {editable ? (
              <form className="c-appointment-card__comment-form" onSubmit={(event) => void handleCommentSubmit(event)}>
                <div className="c-appointment-card__comment-input-shell">
                  <input
                    className="c-appointment-card__comment-input"
                    type="text"
                    value={commentText}
                    maxLength={500}
                    placeholder="Añadir comentario"
                    autoComplete="off"
                    onChange={(event) => setCommentText(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="c-appointment-card__comment-submit"
                    disabled={!canSubmitComment}
                    aria-label={commentBusy ? 'Enviando comentario' : 'Enviar comentario'}
                    aria-busy={commentBusy || undefined}
                  >
                    <TbSend aria-hidden="true" />
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}

      <button
        type="button"
        className="c-appointment-card__expand-toggle"
        aria-label={expanded ? 'Plegar comentarios de la cita' : 'Desplegar comentarios de la cita'}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="c-appointment-card__expand-summary">{commentsCountLabel}</span>
        {expanded ? <TbChevronUp aria-hidden="true" /> : <TbChevronDown aria-hidden="true" />}
      </button>
    </article>
  );
}
