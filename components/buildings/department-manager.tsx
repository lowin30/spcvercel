"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client" // Use client singleton logic
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Star, Phone, Edit, Trash } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

interface Telefono {
    id: number;
    departamento_id: number;
    numero: string;
    nombre_contacto: string;
    es_principal: boolean;
    relacion: string;
    notas: string;
}

interface Departamento {
    id?: number;
    edificio_id: number;
    codigo: string;
    propietario: string;
    notas: string;
    telefonos?: Telefono[];
}

export function DepartmentManager({ buildingId }: { buildingId: number }) {
    const [departamentos, setDepartamentos] = useState<Departamento[]>([])
    const [cargandoDepartamentos, setCargandoDepartamentos] = useState(false)
    const [departamentosDialogOpen, setDepartamentosDialogOpen] = useState(false)
    const [nuevoDepartamento, setNuevoDepartamento] = useState({ codigo: "", propietario: "", notas: "" })
    const [creandoDepartamento, setCreandoDepartamento] = useState(false)

    // Estados para gestión de teléfonos
    const [telefonoDialogOpen, setTelefonoDialogOpen] = useState(false)
    const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState<number | null>(null)
    const [nuevoTelefono, setNuevoTelefono] = useState({
        numero: "",
        nombre_contacto: "",
        es_principal: false,
        relacion: "",
        notas: ""
    })
    const [editandoTelefono, setEditandoTelefono] = useState<number | null>(null)
    const [procesandoTelefono, setProcesandoTelefono] = useState(false)

    const supabase = createClient()
    const { toast } = useToast()

    // Función para ordenar departamentos
    const ordenarDepartamentos = (deptos: Departamento[]) => {
        return [...deptos].sort((a, b) => {
            const codA = a.codigo.toLowerCase();
            const codB = b.codigo.toLowerCase();
            if (codA.includes('porter') && !codB.includes('porter')) return -1;
            if (!codA.includes('porter') && codB.includes('porter')) return 1;
            if (codA.includes('pb') && !codB.includes('pb')) return -1;
            if (!codA.includes('pb') && codB.includes('pb')) return 1;
            return codA.localeCompare(codB, 'es', { numeric: true });
        });
    };

    useEffect(() => {
        const cargarDepartamentos = async () => {
            if (!buildingId) return;
            setCargandoDepartamentos(true);
            try {
                const { data: departamentosData, error: departamentosError } = await supabase
                    .from("departamentos")
                    .select('id, codigo, propietario, notas, edificio_id')
                    .eq("edificio_id", buildingId);

                if (departamentosError) throw departamentosError;
                if (!departamentosData) { setDepartamentos([]); return; }

                const idsDepartamentos = departamentosData.map((d) => d.id);
                const { data: telefonosData, error: telefonosError } = await supabase
                    .from("telefonos_departamento")
                    .select('*')
                    .in("departamento_id", idsDepartamentos);

                const departamentosConTelefonos = departamentosData.map((depto) => ({
                    ...depto,
                    telefonos: telefonosData?.filter((tel) => tel.departamento_id === depto.id) || []
                }));

                setDepartamentos(departamentosConTelefonos);

            } catch (error: any) {
                toast({ title: "Error", description: "Ocurrió un error al cargar los departamentos", variant: "destructive" });
            } finally {
                setCargandoDepartamentos(false);
            }
        };
        cargarDepartamentos();
    }, [buildingId]);

    return (
        <div className="space-y-6">
            {/* Sección de Departamentos */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Departamentos</CardTitle>
                    <div className="flex gap-2">
                        <Dialog open={departamentosDialogOpen} onOpenChange={setDepartamentosDialogOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="flex items-center gap-1">
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden md:inline">Agregar departamento</span>
                                    <span className="md:hidden">Agregar</span>
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Crear Nuevo Departamento</DialogTitle>
                                    <DialogDescription>
                                        Complete los datos para crear un nuevo departamento
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 py-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="codigo">Código *</Label>
                                        <Input
                                            id="codigo"
                                            value={nuevoDepartamento.codigo}
                                            onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, codigo: e.target.value })}
                                            placeholder="Ej: 1A, 2B, PB"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="propietario">Propietario</Label>
                                        <Input
                                            id="propietario"
                                            value={nuevoDepartamento.propietario}
                                            onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, propietario: e.target.value })}
                                            placeholder="Nombre del propietario"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="notas">Notas</Label>
                                        <Textarea
                                            id="notas"
                                            value={nuevoDepartamento.notas}
                                            onChange={(e) => setNuevoDepartamento({ ...nuevoDepartamento, notas: e.target.value })}
                                            placeholder="Información adicional"
                                            rows={2}
                                        />
                                    </div>

                                    <DialogFooter>
                                        <Button
                                            type="button"
                                            disabled={!nuevoDepartamento.codigo || creandoDepartamento}
                                            onClick={async () => {
                                                if (!nuevoDepartamento.codigo || !buildingId) return;
                                                setCreandoDepartamento(true);
                                                try {
                                                    const { data, error } = await supabase
                                                        .from("departamentos")
                                                        .insert({
                                                            edificio_id: buildingId,
                                                            codigo: nuevoDepartamento.codigo,
                                                            propietario: nuevoDepartamento.propietario || null,
                                                            notas: nuevoDepartamento.notas || null
                                                        })
                                                        .select();
                                                    if (error) throw error;

                                                    toast({ title: "Departamento creado" });
                                                    if (data && data[0]) {
                                                        setDepartamentos([...departamentos, { ...data[0], telefonos: [] }]);
                                                    }
                                                    setNuevoDepartamento({ codigo: "", propietario: "", notas: "" });
                                                    setDepartamentosDialogOpen(false);
                                                } catch (error: any) {
                                                    toast({ title: "Error", description: error.message, variant: "destructive" });
                                                } finally {
                                                    setCreandoDepartamento(false);
                                                }
                                            }}
                                        >
                                            {creandoDepartamento ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Crear departamento"}
                                        </Button>
                                    </DialogFooter>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>

                <CardContent>
                    {cargandoDepartamentos ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : departamentos.length > 0 ? (
                        <Accordion type="multiple" className="w-full">
                            {ordenarDepartamentos(departamentos).map((depto: Departamento) => {
                                const tieneTelefonoPrincipal = depto.telefonos?.some((tel) => tel.es_principal);
                                const cantidadTelefonos = depto.telefonos?.length || 0;

                                return (
                                    <AccordionItem key={depto.id} value={`depto-${depto.id}`} className="border rounded-md mb-2 overflow-hidden">
                                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                                            <div className="flex items-center w-full justify-between mr-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{depto.codigo}</span>
                                                    {tieneTelefonoPrincipal && <Badge className="bg-green-500"><Star className="h-3 w-3 mr-1" /> Principal</Badge>}
                                                    {cantidadTelefonos > 0 && <Badge variant="outline" className="text-xs"><Phone className="h-3 w-3 mr-1" /> {cantidadTelefonos}</Badge>}
                                                </div>
                                                <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                                                    {depto.propietario || "Sin propietario"}
                                                </div>
                                            </div>
                                        </AccordionTrigger>

                                        <AccordionContent className="px-4 pb-3 pt-0">
                                            <div className="space-y-3">
                                                <div className="border-b pb-2">
                                                    {depto.propietario && <p className="text-sm"><span className="font-medium">Propietario:</span> {depto.propietario}</p>}
                                                    {depto.notas && <p className="text-sm mt-1"><span className="font-medium">Notas:</span> {depto.notas}</p>}
                                                    <div className="mt-2 flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost" size="sm" className="h-8 w-8 p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={async (e) => {
                                                                e.preventDefault(); e.stopPropagation();
                                                                if (confirm(`¿Eliminar departamento ${depto.codigo}?`)) {
                                                                    await supabase.from("departamentos").delete().eq("id", depto.id);
                                                                    setDepartamentos(departamentos.filter(d => d.id !== depto.id));
                                                                }
                                                            }}
                                                        >
                                                            <Trash className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-medium">Teléfonos</h4>
                                                        <Button
                                                            variant="ghost" size="sm" className="h-8 px-2 text-xs"
                                                            onClick={(e) => {
                                                                e.preventDefault(); e.stopPropagation();
                                                                setDepartamentoSeleccionado(depto.id as number);
                                                                setEditandoTelefono(null);
                                                                setNuevoTelefono({ numero: "", nombre_contacto: "", es_principal: false, relacion: "", notas: "" });
                                                                setTelefonoDialogOpen(true);
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" /> Agregar
                                                        </Button>
                                                    </div>

                                                    {depto.telefonos && depto.telefonos.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {depto.telefonos.map((tel: Telefono) => (
                                                                <div key={tel.id} className={`flex items-start justify-between p-2 rounded-md ${tel.es_principal ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-1">
                                                                            {tel.es_principal && <Star className="h-3 w-3 text-green-500" />}
                                                                            <span className="font-medium">{tel.numero}</span>
                                                                        </div>
                                                                        <p className="text-xs text-muted-foreground">{tel.nombre_contacto} {tel.relacion && `(${tel.relacion})`}</p>
                                                                    </div>
                                                                    <div className="flex gap-1">
                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            setDepartamentoSeleccionado(depto.id as number); setEditandoTelefono(tel.id);
                                                                            setNuevoTelefono({ numero: tel.numero, nombre_contacto: tel.nombre_contacto, es_principal: tel.es_principal, relacion: tel.relacion, notas: tel.notas });
                                                                            setTelefonoDialogOpen(true);
                                                                        }}><Edit className="h-3 w-3" /></Button>
                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={async (e) => {
                                                                            e.preventDefault(); e.stopPropagation();
                                                                            if (confirm("¿Eliminar teléfono?")) {
                                                                                await supabase.from("telefonos_departamento").delete().eq("id", tel.id);
                                                                                const updated = departamentos.map(d => d.id === depto.id ? { ...d, telefonos: d.telefonos?.filter(t => t.id !== tel.id) } : d);
                                                                                setDepartamentos(updated);
                                                                            }
                                                                        }}><Trash className="h-3 w-3" /></Button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <p className="text-xs text-muted-foreground">No hay teléfonos.</p>}
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    ) : <p className="text-sm text-muted-foreground">No hay departamentos.</p>}
                </CardContent>
            </Card>

            <Dialog open={telefonoDialogOpen} onOpenChange={setTelefonoDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editandoTelefono ? "Editar Teléfono" : "Agregar Teléfono"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Input value={nuevoTelefono.numero} onChange={e => setNuevoTelefono({ ...nuevoTelefono, numero: e.target.value })} placeholder="Número" />
                        <Input value={nuevoTelefono.nombre_contacto} onChange={e => setNuevoTelefono({ ...nuevoTelefono, nombre_contacto: e.target.value })} placeholder="Nombre" />
                        <Input value={nuevoTelefono.relacion} onChange={e => setNuevoTelefono({ ...nuevoTelefono, relacion: e.target.value })} placeholder="Relación" />
                        <div className="flex items-center space-x-2">
                            <Checkbox id="es_principal" checked={nuevoTelefono.es_principal} onCheckedChange={c => setNuevoTelefono({ ...nuevoTelefono, es_principal: !!c })} />
                            <Label htmlFor="es_principal">Principal</Label>
                        </div>
                        <Textarea value={nuevoTelefono.notas} onChange={e => setNuevoTelefono({ ...nuevoTelefono, notas: e.target.value })} placeholder="Notas" />
                        <DialogFooter>
                            <Button disabled={procesandoTelefono} onClick={async () => {
                                setProcesandoTelefono(true);
                                try {
                                    if (editandoTelefono) {
                                        await supabase.from("telefonos_departamento").update(nuevoTelefono).eq("id", editandoTelefono);
                                    } else {
                                        await supabase.from("telefonos_departamento").insert({ ...nuevoTelefono, departamento_id: departamentoSeleccionado });
                                    }
                                    // Simplified refresh logic
                                    const { data: deptos } = await supabase.from("departamentos").select("id").eq("edificio_id", buildingId); // Trigger re-fetch logic or optimize
                                    // Actually better to just close and toast, let user refresh or optimize state later. 
                                    // Integrating state update manually is complex here without full code.
                                    toast({ title: "Teléfono guardado. Recargando..." });
                                    window.location.reload(); // Lazy reload to ensuring sync
                                } catch (e) { console.error(e); }
                                setProcesandoTelefono(false);
                            }}>Guardar</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
