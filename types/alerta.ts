export interface Alerta {
  id: number
  tipo_alerta: string
  mensaje: string
  id_entidad: number
  tipo_entidad: string
  leida: boolean
  id_usuario_destino: string
  fecha_creacion: string
}
