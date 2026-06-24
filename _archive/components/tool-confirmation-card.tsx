
import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X } from "lucide-react";
import { ToolInvocation } from 'ai';

interface ToolConfirmationCardProps {
    toolInvocation: ToolInvocation;
    onConfirm: (toolCallId: string, actionFn: string, args: any) => void;
    onReject: (toolCallId: string) => void;
}

export function ToolConfirmationCard({ toolInvocation, onConfirm, onReject }: ToolConfirmationCardProps) {
    const { toolName, args, toolCallId } = toolInvocation;

    // Configuración visual por herramienta
    const getToolConfig = (name: string) => {
        switch (name) {
            case 'registrar_gasto':
            case 'solicitar_confirmacion_gasto': // Nombre alternativo si usamos wrapper
                return {
                    title: 'Confirmar Gasto',
                    color: 'bg-amber-50 border-amber-200 text-amber-900',
                    icon: <AlertCircle className="w-5 h-5 text-amber-600" />,
                    details: args ? (
                        <div className="text-sm space-y-1 mt-2">
                            <p><strong>Monto:</strong> ${args.monto?.toLocaleString()}</p>
                            <p><strong>Concepto:</strong> {args.descripcion}</p>
                            <p><strong>Categoría:</strong> {args.categoria || 'General'}</p>
                        </div>
                    ) : null
                };
            case 'eliminar_tarea':
            case 'finalizar_obra':
                return {
                    title: 'Confirmar Acción Crítica',
                    color: 'bg-red-50 border-red-200 text-red-900',
                    icon: <AlertCircle className="w-5 h-5 text-red-600" />,
                    details: args ? (
                        <div className="text-sm space-y-1 mt-2">
                            <p><strong>Acción:</strong> {toolName}</p>
                            <p><strong>ID Objetivo:</strong> {args.id || args.tarea_id}</p>
                            <p className="text-xs text-red-600 font-bold mt-1">⚠️ Esta acción puede ser irreversible.</p>
                        </div>
                    ) : null
                };
            default:
                return {
                    title: `Confirmar Acción: ${toolName}`,
                    color: 'bg-blue-50 border-blue-200 text-blue-900',
                    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
                    details: <pre className="text-xs mt-2 overflow-x-auto p-2 bg-white/50 rounded">{JSON.stringify(args, null, 2)}</pre>
                };
        }
    };

    const config = getToolConfig(toolName);

    return (
        <div className={`rounded-xl border p-4 shadow-sm my-2 ${config.color}`}>
            <div className="flex items-start gap-3">
                <div className="mt-0.5">{config.icon}</div>
                <div className="flex-1">
                    <h4 className="font-semibold text-sm">{config.title}</h4>
                    {config.details}

                    <div className="flex gap-2 mt-4">
                        <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm"
                            onClick={() => onConfirm(toolCallId, toolName, args)}
                        >
                            <Check className="w-4 h-4 mr-1.5" /> Confirmar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-sm"
                            onClick={() => onReject(toolCallId)}
                        >
                            <X className="w-4 h-4 mr-1.5" /> Cancelar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
