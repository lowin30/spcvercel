# 🔐 Variables de Entorno Requeridas

## Groq API Key

Para usar la integración con Groq, agrega esta variable a tu archivo `.env.local`:

```bash
GROQ_API_KEY=gsk_TU_API_KEY_AQUI
```

**⚠️ NUNCA subas tu API key a GitHub**

## Supabase Edge Functions

Para Edge Functions, configura la variable en Supabase Dashboard:
1. Ve a Project Settings → Edge Functions
2. Agrega secret: `GROQ_API_KEY`
3. Valor: tu API key de Groq

## n8n

En n8n, configura como variable de entorno:
```
GROQ_API_KEY=gsk_TU_API_KEY_AQUI
```

O usa el credential manager de n8n para Groq API.
