---
name: chat-tool-integration
description: Protocol for integrating Interactive UI Tools into the Chat Widget (Server -> Client Protocol).
---

# Chat Tool Integration Protocol (UI-First)

To add a new Interactive Tool (that opens a UI Form/Component) to the Chat Widget, you must bridge the gap between the Vercel AI SDK (Server) and the Custom Chat Client Parser.

## 1. Tool Definition (Server)
Path: `lib/ai/tools.ts`

When defining the tool with `zod` parameters, you **MUST** inject a specific XML instruction in the `info` or return value to trigger the client parser.

```typescript
export const my_new_tool = tool({
    description: '...',
    parameters: z.object({ ... }),
    execute: async (args) => {
        // ... logic ...
        return {
            // ... internal data ...
            
            // 🔥 CRITICAL: XML INJECTION FOR LEGACY CLIENT PARSER
            info: `✅ Acción completada. TU RESPUESTA FINAL DEBE INCLUIR: <tool_code>{"tool":"my_new_tool","args":${JSON.stringify(args)}}</tool_code>`
        };
    }
})
```

## 2. Client Parser (Whitelist)
Path: `components/ai-chat-widget.tsx`

The client parses the streaming response looking for `<tool_code>`. You must add your tool name to the parser logic (around line 950-1000).

```typescript
// Inside streaming loop...
const toolCall = JSON.parse(jsonContent.trim())
const functionName = toolCall.tool || ...

if (functionName === 'crear_edificio') {
    // ...
} else if (functionName === 'my_new_tool') { // 👈 ADD THIS BLOCK
    setMessages(prev => {
        // Standard "Add Tool Invocation" logic
        const newToolInvocation = {
            toolCallId: `call_${Date.now()}`,
            toolName: 'my_new_tool',
            args: toolCall.args,
            state: 'call'
        }
        // ... merge into messages ...
    })
    assistantContent += `\n[Activando My New Tool...]\n`
}
```

## 3. Component Rendering (Interceptor)
Path: `components/ai-chat-widget.tsx` -> `renderToolResult` function

Finally, map the tool invocation to a visible React Component.

```typescript
const renderToolResult = (toolInvocation: ToolInvocation) => {
    // ...
    if (toolInvocation.toolName === 'my_new_tool') {
        return (
            <div className="w-full my-2">
                <MyNewComponent 
                    data={toolInvocation.args} 
                    onSuccess={() => { ... }}
                />
            </div>
        )
    }
    // ...
}
```

## Summary Checklist
- [ ] **Server:** Tool returns `info` with `<tool_code>` instruction.
- [ ] **Client:** Tool Name added to `processSubmission` streaming parser.
- [ ] **UI:** Tool Name added to `renderToolResult` with component.
