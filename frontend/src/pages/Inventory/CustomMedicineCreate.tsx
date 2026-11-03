import { useNavigate } from 'react-router-dom';
import { useMutationContext } from '../../hooks/use.mutation-context';
import { CustomMedicineForm } from '../../components/organisms/CustomMedicineForm';
import { ROUTES } from '../../constants/routes';
import { createMedicine } from '../../services/medicines.service';
import { useMedicinesStore } from '../../stores/medicines.store';
import { useUiStore } from '../../stores/ui.store';

export function CustomMedicineCreate({
  blisterId,
  initialName,
  fromPhoto,
}: {
  blisterId: string;
  initialName?: string;
  fromPhoto?: boolean;
}) {
  const navigate = useNavigate();
  const captureMutation = useMutationContext();
  const upsert = useMedicinesStore((s) => s.upsertMedicine);
  const addToast = useUiStore((s) => s.addToast);
  return (
    <section className="c-add-medicine-page" aria-label="Crear producto personalizado">
      <CustomMedicineForm
        initialName={initialName}
        fromPhoto={fromPhoto}
        onSave={async (input) => {
          const isCurrent = captureMutation();
          const medicine = await createMedicine(blisterId, input);
          if (!isCurrent()) return;
          upsert(medicine);
          addToast({ message: 'Producto añadido al botiquín.', variant: 'success' });
          navigate(ROUTES.blisterMedications(blisterId));
        }}
      />
    </section>
  );
}
