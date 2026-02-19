"use server"

import {
  convertirPresupuestoADosFacturas as secureConvert,
  desaprobarPresupuesto as secureDesaprobar
} from "@/app/actions/facturas-actions"

export async function convertirPresupuestoADosFacturas(presupuestoId: number) {
  return await secureConvert(presupuestoId);
}

export async function desaprobarPresupuesto(presupuestoId: number) {
  return await secureDesaprobar(presupuestoId);
}
