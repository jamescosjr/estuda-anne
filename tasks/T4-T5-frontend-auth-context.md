# T4 & T5 — Frontend: Saneamento de Sessão e Tratamento de 401 no Perfil (`frontend-engineer` + `frontend-quality`)

- **Status:** `[x] Especificado / Pronto para VPS`
- **Ambiente Alvo:** VPS `/srv/estuda-anne/apps/frontend`
- **Arquivos Alvo:** `auth-context.tsx` (L140:290), `route.ts` (L1:160, proxy de `users/profile`).

## Diagnóstico Confirmado
- O cliente em `auth-context.tsx` (`updateProfile`) só envia `Authorization: Bearer <token>` se houver `token` na sessão armazenada.
- Quando a usuária possui uma sessão armazenada antiga/demonstração (com dados de `user` no `localStorage`, mas sem `token` válido) ou quando o JWT expirou, a UI continua exibindo a usuária como logada, mas a chamada para adicionar matéria no perfil (`users/profile` via `updateProfile`) falha com `401 Unauthorized`.

---

## Implementação de Referência (`T4` — `frontend-engineer`)

### 1. Helper `isJwtValid` + Saneamento na Hidratação + Tratamento de `401` em `auth-context.tsx`
Adicionar o helper `isJwtValid` no `auth-context.tsx` e integrá-lo tanto no `useEffect` de restauração de sessão quanto na função `updateProfile`:

```typescript
/**
 * Verifica se um token JWT possui estrutura válida (3 segmentos) e,
 * caso contenha a claim `exp`, se ainda não expirou (com margem de 5s).
 */
export function isJwtValid(token: string | null | undefined): token is string {
  if (!token || typeof token !== "string") return false;
  const trimmed = token.trim();
  const parts = trimmed.split(".");
  if (parts.length !== 3 || parts.some((p) => p.length === 0)) {
    return false;
  }

  try {
    // Converte Base64URL para Base64 padrão + padding
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const jsonPayload = atob(padded);
    const payload = JSON.parse(jsonPayload) as { exp?: number };

    if (typeof payload.exp === "number") {
      const nowSeconds = Math.floor(Date.now() / 1000);
      // Rejeita tokens já expirados ou que expiram nos próximos 5 segundos
      if (payload.exp <= nowSeconds + 5) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
```

#### A. Hidratação Segura da Sessão (`useEffect` inicial em `auth-context.tsx`, aprox. L140:195)
Garantir que uma sessão salva no `localStorage` sem token válido ou com JWT expirado seja imediatamente limpa ao inicializar o app:

```typescript
useEffect(() => {
  try {
    // Ajustar os nomes das chaves para as constantes já utilizadas no arquivo (ex.: STORAGE_USER_KEY, STORAGE_TOKEN_KEY)
    const rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      const candidateToken: string | null =
        storedToken ?? parsed?.token ?? parsed?.accessToken ?? null;

      if (!isJwtValid(candidateToken)) {
        // Sessão legada/demo sem token ou com JWT expirado: limpa imediatamente
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setToken(null);
        return;
      }

      setUser(parsed.user ?? parsed);
      setToken(candidateToken);
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setToken(null);
  } finally {
    setIsLoading(false);
  }
}, []);
```

#### B. Guarda Preventiva e Tratamento Explícito de `401` em `updateProfile` (`auth-context.tsx`, aprox. L200:290)
Ao adicionar matéria no perfil (ou salvar alterações de perfil), impedir chamadas sem token válido e tratar `401` limpando a sessão inválida:

```typescript
const updateProfile = async (updates: Partial<UserProfile>) => {
  // 1. Recupera o token do estado ou storage e valida antes de enviar a requisição
  const activeToken = token ?? localStorage.getItem(TOKEN_STORAGE_KEY);

  if (!isJwtValid(activeToken)) {
    // Limpa estado inconsistente ("sessão fantasma")
    logout();
    throw new Error(
      "Sua sessão expirou ou é inválida. Faça login novamente para adicionar matérias ao perfil."
    );
  }

  const response = await fetch("/api/users/profile", {
    method: "PUT", // preservar o método exato usado pelo projeto (PUT ou PATCH)
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${activeToken}`,
    },
    body: JSON.stringify(updates),
  });

  // 2. Tratamento explícito para 401 Unauthorized vindo do Auth/BFF
  if (response.status === 401) {
    let errorData: { message?: string; code?: string; reason?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // ignora erro de parse caso corpo não seja JSON
    }

    // Invalida a sessão local para que a usuária refaça login limpo
    logout();

    const friendlyMessage =
      errorData.code === "TOKEN_EXPIRED"
        ? "Sua sessão expirou. Faça login novamente para salvar suas matérias."
        : "Não foi possível autenticar sua sessão (401). Faça login novamente para atualizar seu perfil.";

    throw new Error(friendlyMessage);
  }

  if (!response.ok) {
    let errorMessage = "Erro ao atualizar perfil.";
    try {
      const errBody = await response.json();
      if (errBody?.message) errorMessage = errBody.message;
    } catch {
      // fallback para mensagem padrão
    }
    throw new Error(errorMessage);
  }

  const updatedUser = await response.json();
  setUser(updatedUser);
  // Atualizar também o storage local mantendo o activeToken válido
  return updatedUser;
};
```

### 2. Verificação do Route Proxy (`route.ts`, L1:160)
Confirmar que o Route Handler do Next.js para `users/profile` repassa o header `Authorization` recebido e devolve o status `401` e o JSON original do BFF:

```typescript
const authHeader = request.headers.get("authorization");
const headers: Record<string, string> = {
  "Content-Type": "application/json",
};
if (authHeader) {
  headers["Authorization"] = authHeader;
}

const bffResponse = await fetch(`${BFF_BASE_URL}/users/profile`, {
  method: request.method,
  headers,
  body: JSON.stringify(body),
});

const responseBody = await bffResponse.text();
return new NextResponse(responseBody, {
  status: bffResponse.status,
  headers: {
    "Content-Type": bffResponse.headers.get("content-type") || "application/json",
  },
});
```

---

## Validação e Gate (`T5` — `frontend-quality`)
Executar em `/srv/estuda-anne/apps/frontend`:
```bash
pnpm --filter frontend lint
pnpm --filter frontend typecheck
pnpm --filter frontend build
```
*(Ou `npm run lint`, `npx tsc --noEmit`, `npm run build` dentro de `/srv/estuda-anne/apps/frontend`, conforme o gerenciador de pacotes do monorepo).*
