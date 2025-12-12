export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      administradores: {
        Row: {
          aplica_ajustes: boolean | null
          code: string | null
          created_at: string | null
          email1: string | null
          email2: string | null
          estado: string | null
          id: number
          nombre: string
          porcentaje_default: number | null
          telefono: string
        }
        Insert: {
          aplica_ajustes?: boolean | null
          code?: string | null
          created_at?: string | null
          email1?: string | null
          email2?: string | null
          estado?: string | null
          id?: number
          nombre: string
          porcentaje_default?: number | null
          telefono: string
        }
        Update: {
          aplica_ajustes?: boolean | null
          code?: string | null
          created_at?: string | null
          email1?: string | null
          email2?: string | null
          estado?: string | null
          id?: number
          nombre?: string
          porcentaje_default?: number | null
          telefono?: string
        }
        Relationships: []
      }
      ajustes_facturas: {
        Row: {
          aprobado: boolean | null
          created_at: string | null
          descripcion_item: string | null
          fecha_aprobacion: string | null
          fecha_pago: string | null
          id: number
          id_factura: number | null
          id_item: number | null
          monto_ajuste: number | null
          monto_base: number | null
          pagado: boolean | null
          porcentaje_ajuste: number | null
        }
        Insert: {
          aprobado?: boolean | null
          created_at?: string | null
          descripcion_item?: string | null
          fecha_aprobacion?: string | null
          fecha_pago?: string | null
          id?: number
          id_factura?: number | null
          id_item?: number | null
          monto_ajuste?: number | null
          monto_base?: number | null
          pagado?: boolean | null
          porcentaje_ajuste?: number | null
        }
        Update: {
          aprobado?: boolean | null
          created_at?: string | null
          descripcion_item?: string | null
          fecha_aprobacion?: string | null
          fecha_pago?: string | null
          id?: number
          id_factura?: number | null
          id_item?: number | null
          monto_ajuste?: number | null
          monto_base?: number | null
          pagado?: boolean | null
          porcentaje_ajuste?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_facturas_id_factura_fkey"
            columns: ["id_factura"]
            isOneToOne: false
            referencedRelation: "facturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_facturas_id_factura_fkey"
            columns: ["id_factura"]
            isOneToOne: false
            referencedRelation: "vista_facturas_completa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_facturas_id_item_fkey"
            columns: ["id_item"]
            isOneToOne: false
            referencedRelation: "items_factura"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_sistema: {
        Row: {
          fecha_creacion: string | null
          id: number
          id_entidad: number | null
          id_usuario_destino: string | null
          leida: boolean | null
          mensaje: string
          tipo_alerta: string
          tipo_entidad: string | null
        }
        Insert: {
          fecha_creacion?: string | null
          id?: number
          id_entidad?: number | null
          id_usuario_destino?: string | null
          leida?: boolean | null
          mensaje: string
          tipo_alerta: string
          tipo_entidad?: string | null
        }
        Update: {
          fecha_creacion?: string | null
          id?: number
          id_entidad?: number | null
          id_usuario_destino?: string | null
          leida?: boolean | null
          mensaje?: string
          tipo_alerta?: string
          tipo_entidad?: string | null
        }
        Relationships: []
      }
      categorias_productos: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          code: string | null
          contenido: string
          created_at: string | null
          foto_url: string | null
          id: number
          id_tarea: number
          id_usuario: string | null
        }
        Insert: {
          code?: string | null
          contenido: string
          created_at?: string | null
          foto_url?: string | null
          id?: number
          id_tarea: number
          id_usuario?: string | null
        }
        Update: {
          code?: string | null
          contenido?: string
          created_at?: string | null
          foto_url?: string | null
          id?: number
          id_tarea?: number
          id_usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comentarios_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "vista_facturas_completa"
            referencedColumns: ["tarea_id"]
          },
          {
            foreignKeyName: "comentarios_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "vista_tareas_completa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comentarios_id_usuario_fkey"
            columns: ["id_usuario"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_trabajadores: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id_trabajador: string
          salario_diario: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id_trabajador: string
          salario_diario: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id_trabajador?: string
          salario_diario?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "configuracion_trabajadores_id_trabajador_fkey"
            columns: ["id_trabajador"]
            isOneToOne: true
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          codigo: string
          created_at: string | null
          edificio_id: number
          id: number
          notas: string | null
          propietario: string | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          edificio_id: number
          id?: number
          notas?: string | null
          propietario?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          edificio_id?: number
          id?: number
          notas?: string | null
          propietario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "edificios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "vista_edificios_completa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_edificio_id_fkey"
            columns: ["edificio_id"]
            isOneToOne: false
            referencedRelation: "vista_facturas_completa"
            referencedColumns: ["edificio_id"]
          },
        ]
      }
      departamentos_tareas: {
        Row: {
          created_at: string | null
          id: number
          id_departamento: number
          id_tarea: number
        }
        Insert: {
          created_at?: string | null
          id?: number
          id_departamento: number
          id_tarea: number
        }
        Update: {
          created_at?: string | null
          id?: number
          id_departamento?: number
          id_tarea?: number
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_tareas_id_departamento_fkey"
            columns: ["id_departamento"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departamentos_tareas_id_tarea_fkey"
            columns: ["id_tarea"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      
      /* ... truncated types content to keep brevity ... */

    }
  }
}
