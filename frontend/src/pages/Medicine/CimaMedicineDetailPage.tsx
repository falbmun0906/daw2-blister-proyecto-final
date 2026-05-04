import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  TbAlertCircle,
  TbBook2,
  TbFileDescription,
  TbInfoCircle,
  TbPhoto,
  TbShare,
  TbTriangle,
  TbUsers,
} from 'react-icons/tb';
import { FaBriefcaseMedical } from 'react-icons/fa6';

import { Avatar } from '../../components/atoms/Avatar';
import { Button } from '../../components/atoms/Button';
import { ErrorState } from '../../components/atoms/ErrorState';
import { Skeleton } from '../../components/atoms/Skeleton';
import { ROUTES } from '../../constants/routes';
import { usePageTitle } from '../../hooks/use.page-title';
import { getCimaDetail } from '../../services/external.service';
import { listBlisterMembers } from '../../services/blisters.service';
import { listMedicines } from '../../services/medicines.service';
import { useAuthStore } from '../../stores/auth.store';
import { useBlisterStore } from '../../stores/blister.store';
import { isApiError } from '../../types/api.types';
import type { BlisterMemberDetail } from '../../types/blister.types';
import type { ExternalMedicineInfo } from '../../types/medicine.types';
import './CimaMedicineDetailPage.scss';

const CIMA_DOC_TYPE_FICHA_TECNICA = 1;
const CIMA_DOC_TYPE_PROSPECTO = 2;

interface BlisterUsage {
  blisterId: string;
  name: string;
  ownerName: string;
  members: BlisterMemberDetail[];
}

function formatAuth(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatPrincipio(p: ExternalMedicineInfo['principiosActivos'][number]): string {
  const cantidad = p.cantidad ? `${p.cantidad}${p.unidad ? ` ${p.unidad}` : ''}` : null;
  return cantidad ? `${p.nombre} (${cantidad})` : p.nombre;
}

function CimaMedicineDetailPage() {
  usePageTitle('Ficha de medicamento');
  const navigate = useNavigate();
  const { nregist } = useParams<{ nregist: string }>();
  const activeBlisterId = useBlisterStore((s) => s.activeBlisterId);
  const activeRole = useBlisterStore((s) => s.activeRole);
  const blisters = useBlisterStore((s) => s.blisters);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const [info, setInfo] = useState<ExternalMedicineInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [usage, setUsage] = useState<BlisterUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    if (!nregist) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getCimaDetail(nregist)
      .then((data) => {
        if (!cancelled) setInfo(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(isApiError(err) ? err.message : 'No se ha podido cargar la ficha CIMA.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nregist]);

  // Calcula en qué blísters del usuario está presente este medicamento.
  useEffect(() => {
    if (!nregist || blisters.length === 0) {
      setUsage([]);
      return;
    }
    let cancelled = false;
    setUsageLoading(true);
    Promise.all(
      blisters.map(async (b) => {
        try {
          const meds = await listMedicines(b._id);
          if (!meds.some((m) => m.nregist === nregist)) return null;
          const members = await listBlisterMembers(b._id).catch(
            () => [] as BlisterMemberDetail[],
          );
          const owner = members.find((m) => m.role === 'OWNER');
          return {
            blisterId: b._id,
            name: b.name,
            ownerName: owner?.fullName ?? '—',
            members,
          } satisfies BlisterUsage;
        } catch {
          return null;
        }
      }),
    )
      .then((results) => {
        if (cancelled) return;
        setUsage(results.filter((r): r is BlisterUsage => r !== null));
      })
      .finally(() => {
        if (!cancelled) setUsageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nregist, blisters]);

  const fichaTecnica = info?.docs.find((d) => d.tipo === CIMA_DOC_TYPE_FICHA_TECNICA && d.url);
  const prospecto = info?.docs.find((d) => d.tipo === CIMA_DOC_TYPE_PROSPECTO && d.url);
  const fotos = info?.fotos.filter((f) => f.url) ?? [];

  const canMutate = activeRole === 'OWNER' || activeRole === 'CAREGIVER';

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: info?.nombre ?? 'Medicamento', url });
        return;
      } catch {
        /* usuario canceló o no soportado */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* sin permisos: no hacemos nada */
    }
  };

  // Avatares secundarios para la fila "Usado en" (excluye al usuario actual).
  const usageWithExtras = useMemo(
    () =>
      usage.map((u) => ({
        ...u,
        others: u.members.filter((m) => m.userId !== userId),
      })),
    [usage, userId],
  );

  if (!nregist) return <Navigate to={ROUTES.home} replace />;

  return (
    <section className="c-cima-detail" aria-labelledby="cima-detail-title">
      {isLoading ? (
        <div aria-busy="true" className="c-cima-detail__skeleton">
          <Skeleton height="3rem" />
          <Skeleton height="2rem" />
          <Skeleton height="12rem" />
        </div>
      ) : error || !info ? (
        <ErrorState message={error ?? 'No se ha encontrado el medicamento.'} />
      ) : (
        <>
          <h1 id="cima-detail-title" className="c-cima-detail__title">
            {info.nombre}
          </h1>

          <div className="c-cima-detail__chips" role="group" aria-label="Documentación oficial">
            {fichaTecnica?.url ? (
              <a
                className="c-cima-detail__chip"
                href={fichaTecnica.url}
                target="_blank"
                rel="noreferrer"
              >
                <TbFileDescription aria-hidden="true" />
                <span>Ficha técnica</span>
              </a>
            ) : null}
            {prospecto?.url ? (
              <a
                className="c-cima-detail__chip"
                href={prospecto.url}
                target="_blank"
                rel="noreferrer"
              >
                <TbBook2 aria-hidden="true" />
                <span>Prospecto</span>
              </a>
            ) : null}
            <button
              type="button"
              className="c-cima-detail__chip"
              onClick={() => void handleShare()}
            >
              <TbShare aria-hidden="true" />
              <span>Compartir</span>
            </button>
          </div>

          <section className="c-cima-detail__section" aria-labelledby="cima-info">
            <h2 id="cima-info" className="c-cima-detail__section-title">
              <TbInfoCircle aria-hidden="true" />
              Información del medicamento
            </h2>

            <dl className="c-cima-detail__facts">
              {info.labtitular ? (
                <div className="c-cima-detail__fact">
                  <dt>Laboratorio</dt>
                  <dd>{info.labtitular}</dd>
                </div>
              ) : null}
              <div className="c-cima-detail__fact">
                <dt>Nº Registro</dt>
                <dd>{info.nregist}</dd>
              </div>
              <div className="c-cima-detail__fact">
                <dt>Autorizado</dt>
                <dd>{formatAuth(info.fechaAutorizacion)}</dd>
              </div>
            </dl>

            <hr className="c-cima-detail__rule" />

            <dl className="c-cima-detail__facts">
              {info.formaOficial ? (
                <div className="c-cima-detail__fact">
                  <dt>Formas farmacéuticas</dt>
                  <dd>{info.formaOficial}</dd>
                </div>
              ) : null}
              {info.viasAdministracion.length > 0 ? (
                <div className="c-cima-detail__fact">
                  <dt>Vías de administración</dt>
                  <dd>{info.viasAdministracion.map((v) => v.nombre).join(', ')}</dd>
                </div>
              ) : null}
              {info.dosisOficial ? (
                <div className="c-cima-detail__fact">
                  <dt>Dosis</dt>
                  <dd>{info.dosisOficial}</dd>
                </div>
              ) : null}
            </dl>

            <hr className="c-cima-detail__rule" />

            <dl className="c-cima-detail__facts">
              {info.principiosActivos.length > 0 ? (
                <div className="c-cima-detail__fact">
                  <dt>Principios activos</dt>
                  <dd>{info.principiosActivos.map(formatPrincipio).join(', ')}</dd>
                </div>
              ) : info.pactivos ? (
                <div className="c-cima-detail__fact">
                  <dt>Principios activos</dt>
                  <dd>{info.pactivos}</dd>
                </div>
              ) : null}
              {info.excipientes.length > 0 ? (
                <div className="c-cima-detail__fact">
                  <dt>Excipientes</dt>
                  <dd>
                    <ul className="c-cima-detail__bullets">
                      {info.excipientes.map((e, i) => (
                        <li key={`${e.nombre}-${i}`}>{e.nombre}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {info.cpresc || info.receta || info.triangulo || info.conduc ? (
                <div className="c-cima-detail__fact">
                  <dt>Características</dt>
                  <dd>
                    <ul className="c-cima-detail__bullets">
                      {info.cpresc ? <li>{info.cpresc}</li> : null}
                      {info.receta ? <li>Con receta</li> : null}
                      {info.triangulo ? (
                        <li>
                          <TbTriangle aria-hidden="true" /> Sujeto a seguimiento adicional
                        </li>
                      ) : null}
                      {info.conduc ? <li>Puede afectar a la conducción</li> : null}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {info.atcs.length > 0 ? (
                <div className="c-cima-detail__fact">
                  <dt>Códigos ATC</dt>
                  <dd>
                    <ul className="c-cima-detail__bullets">
                      {info.atcs.map((a, i) => (
                        <li key={`${a.codigo ?? 'atc'}-${i}`}>
                          {a.codigo ? <strong>{a.codigo}</strong> : null}
                          {a.codigo && a.nombre ? ' — ' : null}
                          {a.nombre}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>

            {!info.comerc || info.psum || info.cimaStatus.hasAlerts ? (
              <div className="c-cima-detail__alerts" role="status">
                {!info.comerc ? (
                  <p className="c-cima-detail__alert">
                    <TbAlertCircle aria-hidden="true" /> No comercializado actualmente.
                  </p>
                ) : null}
                {info.psum ? (
                  <p className="c-cima-detail__alert">
                    <TbAlertCircle aria-hidden="true" /> Problemas de suministro.
                  </p>
                ) : null}
                {info.cimaStatus.hasAlerts && !info.psum ? (
                  <p className="c-cima-detail__alert">
                    <TbAlertCircle aria-hidden="true" /> Existen alertas oficiales.
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          {fotos.length > 0 ? (
            <section className="c-cima-detail__section" aria-labelledby="cima-photos">
              <h2 id="cima-photos" className="c-cima-detail__section-title">
                <TbPhoto aria-hidden="true" />
                Imágenes
              </h2>
              <div className="c-cima-detail__photos">
                {fotos.map((f, i) => (
                  <a
                    key={`${f.url}-${i}`}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="c-cima-detail__photo"
                  >
                    <img src={f.url} alt={`${info.nombre} (${f.tipo ?? 'foto'})`} loading="lazy" />
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {usageLoading || usageWithExtras.length > 0 ? (
            <section className="c-cima-detail__section" aria-labelledby="cima-usage">
              <h2 id="cima-usage" className="c-cima-detail__section-title">
                <TbUsers aria-hidden="true" />
                Usado en
              </h2>
              {usageLoading && usageWithExtras.length === 0 ? (
                <Skeleton height="2.5rem" />
              ) : (
                <ul className="c-cima-detail__usage">
                  {usageWithExtras.map((u) => (
                    <li key={u.blisterId} className="c-cima-detail__usage-row">
                      <span className="c-cima-detail__usage-icon" aria-hidden="true">
                        <FaBriefcaseMedical aria-hidden="true" />
                      </span>
                      <div className="c-cima-detail__usage-body">
                        <p className="c-cima-detail__usage-name">{u.name}</p>
                        <p className="c-cima-detail__usage-meta">
                          Propietario: {u.ownerName}
                        </p>
                      </div>
                      <div className="c-cima-detail__usage-avatars" aria-hidden="true">
                        {u.others.slice(0, 2).map((m) => (
                          <Avatar
                            key={m.userId}
                            name={m.fullName}
                            avatarKey={m.avatarKey ?? undefined}
                            size="sm"
                          />
                        ))}
                        {u.others.length > 2 ? (
                          <span className="c-cima-detail__usage-extra">
                            +{u.others.length - 2}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {canMutate && activeBlisterId ? (
            <div className="c-cima-detail__cta c-add-medicine-page__sticky-cta">
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() =>
                  navigate(
                    `${ROUTES.addMedicine(activeBlisterId)}?nregist=${encodeURIComponent(info.nregist)}`,
                    { state: { parentRoute: ROUTES.cimaMedicineDetail(info.nregist) } },
                  )
                }
              >
                <FaBriefcaseMedical aria-hidden="true" />
                Añadir a botiquín
              </Button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export default CimaMedicineDetailPage;
