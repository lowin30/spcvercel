"use client"

// Componente para mostrar una tabla de tareas
import Link from "next/link";
import { TaskStatusBadge } from "./tasks-badge";

// Función para formatear fechas en formato DD/MM/YY importada del dashboard
function formatDateDDMMYY(dateString) {
  if (!dateString) return 'Sin fecha';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
}

export function TasksTable({ tasks = [] }) {
  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2 text-left font-medium">Título</th>
              <th className="px-4 py-2 text-left font-medium">Estado</th>
              <th className="px-4 py-2 text-left font-medium">Fecha de Visita</th>
            </tr>
          </thead>
          <tbody>
            {tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <tr key={task.id} className="border-b">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/tareas/${task.id}`} className="hover:underline text-blue-600">
                      {task.titulo}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <TaskStatusBadge task={task} />
                  </td>
                  <td className="px-4 py-2">{formatDateDDMMYY(task.fecha_visita)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-center text-muted-foreground">
                  No hay tareas recientes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
