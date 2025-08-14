"use client";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const BASE_DB_PATH = "/BASE_DE_DATOS.md";
const ESTADO_SYS_PATH = "/ESTADO_SISTEMA.md";

function fetchMarkdown(path: string): Promise<string> {
  return fetch(path)
    .then(res => res.ok ? res.text() : "No se pudo cargar el archivo.")
    .catch(() => "No se pudo cargar el archivo.");
}

export default function DocsBDPage() {
  const [dbDoc, setDbDoc] = useState<string>("Cargando...");
  const [estadoDoc, setEstadoDoc] = useState<string>("Cargando...");
  const [activeTab, setActiveTab] = useState<'schema' | 'status'>('schema');

  useEffect(() => {
    fetchMarkdown(BASE_DB_PATH).then(setDbDoc);
    fetchMarkdown(ESTADO_SYS_PATH).then(setEstadoDoc);
  }, []);

  return (
    <div style={{maxWidth: 900, margin: "0 auto", padding: 24}}>
      <h1 style={{fontSize: "2rem", fontWeight: 700, marginBottom: 16}}>📊 Documentación Base de Datos SPC</h1>
      
      <div style={{marginBottom: 20}}>
        <div style={{display: "flex", gap: 10, marginBottom: 20}}>
          <button
            onClick={() => setActiveTab('schema')}
            style={{
              padding: "8px 16px",
              background: activeTab === 'schema' ? '#0070f3' : '#e2e8f0',
              color: activeTab === 'schema' ? 'white' : 'black',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Esquema BD
          </button>
          <button
            onClick={() => setActiveTab('status')}
            style={{
              padding: "8px 16px",
              background: activeTab === 'status' ? '#0070f3' : '#e2e8f0',
              color: activeTab === 'status' ? 'white' : 'black',
              border: 'none',
              borderRadius: 5,
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Estado del Sistema
          </button>
        </div>
      </div>

      {activeTab === 'schema' && (
        <section>
          <div style={{background: "#f8f9fa", borderRadius: 8, padding: 16, marginBottom: 24, maxHeight: '70vh', overflowY: 'auto'}}>
            <ReactMarkdown>{dbDoc}</ReactMarkdown>
          </div>
        </section>
      )}
      
      {activeTab === 'status' && (
        <section>
          <div style={{background: "#f8f9fa", borderRadius: 8, padding: 16, maxHeight: '70vh', overflowY: 'auto'}}>
            <ReactMarkdown>{estadoDoc}</ReactMarkdown>
          </div>
        </section>
      )}
      
      <div style={{marginTop: 40, fontSize: '0.875rem', color: '#718096'}}>
        <p>Última generación: 10 de junio, 2025</p>
        <p>Para actualizar estos documentos, edite manualmente los archivos BASE_DE_DATOS.md y ESTADO_SISTEMA.md</p>
      </div>
    </div>
  );
}
