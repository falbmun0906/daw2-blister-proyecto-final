import { create } from 'zustand';

import type { Appointment } from '../types/appointment.types';

interface AppointmentsState {
  appointments: Appointment[];
  setAppointments: (appointments: Appointment[]) => void;
  upsertAppointment: (appointment: Appointment) => void;
  removeAppointment: (appointmentId: string) => void;
  clear: () => void;
}

export const useAppointmentsStore = create<AppointmentsState>((set) => ({
  appointments: [],
  setAppointments: (appointments) => set({ appointments }),
  upsertAppointment: (appointment) =>
    set((state) => {
      const exists = state.appointments.some((a) => a.id === appointment.id);
      return {
        appointments: exists
          ? state.appointments.map((a) => (a.id === appointment.id ? appointment : a))
          : [...state.appointments, appointment],
      };
    }),
  removeAppointment: (appointmentId) =>
    set((state) => ({
      appointments: state.appointments.filter((a) => a.id !== appointmentId),
    })),
  clear: () => set({ appointments: [] }),
}));
