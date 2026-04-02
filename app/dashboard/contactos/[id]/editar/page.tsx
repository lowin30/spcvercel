"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from '@/lib/supabase-client'
import Link from "next/link"
import { Loader2, ArrowLeft, Building2, Phone, Edit, UserPlus, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { UnifiedDeptContactForm } from "@/components/unified-dept-contact-form"
import { Badge } from "@/components/ui/badge"

export default function EditarContactoPage() {
  const params = useParams();
  const id = params?.id as string; // departamento_id
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const depId = decodeURIComponent(id);

      // Cargar contexto del departamento
      const { data: dep, error: depErr } = await supabase
        .from("departamentos")
        .select("id, codigo, edificio_id, edificios(nombre)")
        .eq("id", depId)
        .single();

      if (depErr || !dep) throw new Error("Departamento no encontrado");
      setContext(dep);

      // Cargar contactos
      const { data: conts } = await supabase
        .from("contactos")
        .select("*")
        .eq("departamento_id", depId)
        .order("es_principal", { ascending: false });
      
      setContacts(conts || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
      router.push("/dashboard/contactos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/contactos">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight lowercase">editar contactos</h2>
            <p className="text-zinc-500 text-sm lowercase">
              {context?.edificios?.nombre.toLowerCase()} • depto {context?.codigo.toLowerCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lista de Contactos Actuales */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <CardHeader className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium lowercase">contactos registrados</CardTitle>
                <Badge variant="outline" className="text-[10px] lowercase">{contacts.length} total</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-2 space-y-1 bg-zinc-50/30 dark:bg-zinc-950/30">
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setEditingContact(c);
                    setShowAddForm(false);
                  }}
                  className={`w-full flex flex-col p-3 rounded-md transition-all text-left border ${
                    editingContact?.id === c.id 
                    ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-sm' 
                    : 'border-transparent hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 w-full">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{c.nombreReal?.toLowerCase()}</span>
                    {c.es_principal && <Badge className="text-[8px] h-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-1 border-none capitalize">principal</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <Phone className="w-3 h-3" /> {c.telefono || 'sin numero'}
                    <span className="text-zinc-300">|</span>
                    <span className="capitalize">{c.relacion || 'sin relación'}</span>
                  </div>
                </button>
              ))}
              
              <Button 
                variant="ghost" 
                className="w-full mt-2 h-9 text-xs lowercase gap-2 text-zinc-500 hover:text-zinc-900"
                onClick={() => {
                   setEditingContact(null);
                   setShowAddForm(true);
                }}
              >
                <UserPlus className="w-3.5 h-3.5" /> agregar otro contacto
              </Button>
            </CardContent>
          </Card>
          
          <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50">
            <CardContent className="p-4 flex gap-3 items-start">
              <Info className="w-4 h-4 text-zinc-400 mt-0.5" />
              <p className="text-[11px] text-zinc-500 leading-relaxed font-serif italic">
                los cambios realizados se sincronizaran automaticamente con google contactos y la base de datos platinum.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Editor (Componente Unificado) */}
        <div className="lg:col-span-2">
          {editingContact || showAddForm ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300" key={editingContact?.id || 'new'}>
              <UnifiedDeptContactForm 
                mode={editingContact ? 'edit' : 'create'}
                defaultValues={editingContact ? {
                  id: editingContact.id,
                  nombre_contacto: editingContact.nombreReal || "",
                  relacion: editingContact.relacion || "",
                  numero: editingContact.telefono || "",
                  es_principal: editingContact.es_principal || false,
                  notas: editingContact.notas || "",
                  sin_telefono: !editingContact.telefono
                } : undefined}
                edificioId={context.edificio_id}
                departamentoId={context.id}
                onSuccess={() => {
                  loadData();
                  setEditingContact(null);
                  setShowAddForm(false);
                }}
                onCancel={() => {
                  setEditingContact(null);
                  setShowAddForm(false);
                }}
              />
            </div>
          ) : (
            <Card className="border-dashed border-zinc-200 dark:border-zinc-800 bg-transparent flex items-center justify-center p-20">
              <div className="text-center space-y-3">
                <div className="bg-zinc-100 dark:bg-zinc-900 rounded-full p-4 w-fit mx-auto mb-2">
                  <Edit className="w-8 h-8 text-zinc-300" />
                </div>
                <h3 className="text-sm font-medium text-zinc-500 lowercase font-serif italic">seleccione un contacto para editar</h3>
                <p className="text-xs text-zinc-400 lowercase">o use el boton para agregar uno nuevo</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
