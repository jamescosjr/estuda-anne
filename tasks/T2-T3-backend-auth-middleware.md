# T2 & T3 — Backend Auth: Diagnóstico Seguro de 401 e Gate (`backend-engineer` + `backend-quality`)

- **Status:** `[x] Especificado / Pronto para VPS`
- **Ambiente Alvo:** VPS `/srv/estuda-anne` (Serviço `Auth` e `BFF`)
- **Arquivos Alvo:** `auth.middleware.ts` (L1:120), `authRoutes.ts` (L1:120) e suíte de testes unitários do `auth.middleware`.

## Diagnóstico Confirmado
- A cadeia da requisição é `frontend (172.16.1.7) -> BFF (172.16.1.6) -> Auth`.
- O `BFF` e o proxy do `frontend` encaminham o header `Authorization` corretamente.
- O `auth.middleware.ts` retorna `401` quando o header está ausente, não começa com `Bearer `, ou quando o token é inválido/expirado, porém **não registra nos logs o motivo da recusa**, impedindo diferenciar sessão sem token vs. token expirado vs. assinatura inválida.

---

## Implementação de Referência (`T2` — `backend-engineer`)

### 1. Código TypeScript de Referência para `auth.middleware.ts`
Adaptar ao logger existente no pacote (ou `console.warn(JSON.stringify(...))`), garantindo que **jamais** o valor do token ou de `req.headers.authorization` seja impresso nos logs:

```typescript
import { Request, Response, NextFunction } from "express";
import jwt, { TokenExpiredError, JsonWebTokenError, NotBeforeError } from "jsonwebtoken";

export type AuthFailureReason =
  | "missing_authorization_header"
  | "malformed_authorization_header"
  | "token_expired"
  | "invalid_token";

export type AuthErrorCode =
  | "MISSING_AUTH_HEADER"
  | "MALFORMED_AUTH_HEADER"
  | "TOKEN_EXPIRED"
  | "INVALID_TOKEN";

function logAuthRejection(
  req: Request,
  reason: AuthFailureReason,
  code: AuthErrorCode,
  extra?: Record<string, unknown>
): void {
  const payload = {
    level: "warn",
    event: "auth_rejected",
    status: 401,
    reason,
    code,
    method: req.method,
    path: req.originalUrl || req.url,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  // NUNCA incluir req.headers.authorization ou o token bruto no log
  console.warn(JSON.stringify(payload));
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== "string" || authHeader.trim() === "") {
    logAuthRejection(req, "missing_authorization_header", "MISSING_AUTH_HEADER");
    res.status(401).json({
      message: "Token de autenticação ausente. Faça login novamente.",
      code: "MISSING_AUTH_HEADER",
      reason: "missing_authorization_header",
    });
    return;
  }

  if (!authHeader.startsWith("Bearer ")) {
    logAuthRejection(req, "malformed_authorization_header", "MALFORMED_AUTH_HEADER", {
      schemeProvided: authHeader.split(" ")[0] ? "non_bearer" : "empty",
    });
    res.status(401).json({
      message: "Formato de autorização inválido. Esperado Bearer token.",
      code: "MALFORMED_AUTH_HEADER",
      reason: "malformed_authorization_header",
    });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    logAuthRejection(req, "malformed_authorization_header", "MALFORMED_AUTH_HEADER", {
      detail: "empty_bearer_token",
    });
    res.status(401).json({
      message: "Token Bearer vazio. Faça login novamente.",
      code: "MALFORMED_AUTH_HEADER",
      reason: "malformed_authorization_header",
    });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "auth_misconfiguration",
        reason: "missing_jwt_secret",
        timestamp: new Date().toISOString(),
      })
    );
    res.status(500).json({
      message: "Erro interno de configuração de autenticação.",
      code: "AUTH_CONFIG_ERROR",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);
    // Preservar a atribuição usada pelo repositório (ex.: req.user = decoded ou res.locals.user = decoded)
    (req as Request & { user?: unknown }).user = decoded;
    next();
  } catch (err: unknown) {
    if (err instanceof TokenExpiredError || (err as { name?: string })?.name === "TokenExpiredError") {
      const expiredAt = (err as TokenExpiredError).expiredAt
        ? new Date((err as TokenExpiredError).expiredAt).toISOString()
        : undefined;
      logAuthRejection(req, "token_expired", "TOKEN_EXPIRED", { expiredAt });
      res.status(401).json({
        message: "Sua sessão expirou. Faça login novamente.",
        code: "TOKEN_EXPIRED",
        reason: "token_expired",
      });
      return;
    }

    const errorName =
      err instanceof JsonWebTokenError || err instanceof NotBeforeError
        ? err.name
        : (err as { name?: string })?.name || "UnknownJwtError";

    logAuthRejection(req, "invalid_token", "INVALID_TOKEN", { errorName });
    res.status(401).json({
      message: "Token de autenticação inválido. Faça login novamente.",
      code: "INVALID_TOKEN",
      reason: "invalid_token",
    });
  }
}
```

### 2. Verificação em `authRoutes.ts` e no `BFF`
- Confirmar que as rotas protegidas de atualização de perfil (`PUT /users/profile`, `PATCH /users/profile` ou equivalente em `authRoutes.ts`) utilizam `authMiddleware`.
- Confirmar que o `BFF`, ao receber `401` do serviço `Auth`, repassa o status `401` e o payload `{ message, code, reason }` para o frontend sem converter em `500`.

---

## Validação e Gate (`T3` — `backend-quality`)

### 1. Casos de Teste Unitários de Referência (`auth.middleware.spec.ts` / `auth.middleware.test.ts`)
Adicionar ou atualizar o arquivo de teste do middleware cobrindo todos os cenários:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"; // ou jest conforme o package.json do serviço Auth
import jwt from "jsonwebtoken";
import { authMiddleware } from "./auth.middleware";

describe("authMiddleware", () => {
  const TEST_SECRET = "test-secret-key-do-not-use-in-prod";

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    vi.restoreAllMocks();
  });

  function createMockReqRes(authHeader?: string) {
    const req: any = {
      headers: authHeader !== undefined ? { authorization: authHeader } : {},
      method: "PUT",
      originalUrl: "/users/profile",
    };
    const res: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const next = vi.fn();
    return { req, res, next };
  }

  it("retorna 401 MISSING_AUTH_HEADER quando Authorization está ausente", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { req, res, next } = createMockReqRes(undefined);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "MISSING_AUTH_HEADER",
        reason: "missing_authorization_header",
      })
    );
    expect(next).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"reason":"missing_authorization_header"'));
  });

  it("retorna 401 MALFORMED_AUTH_HEADER quando não inicia com Bearer ou token é vazio", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { req, res, next } = createMockReqRes("Basic abcdef123456");

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "MALFORMED_AUTH_HEADER",
        reason: "malformed_authorization_header",
      })
    );
    expect(next).not.toHaveBeenCalled();
    // Garante que o segredo/token enviado não aparece no log
    expect(warnSpy.mock.calls[0][0]).not.toContain("abcdef123456");
  });

  it("retorna 401 TOKEN_EXPIRED quando o JWT está expirado sem vazar o token no log", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const expiredToken = jwt.sign({ sub: "user-123" }, TEST_SECRET, { expiresIn: -10 });
    const { req, res, next } = createMockReqRes(`Bearer ${expiredToken}`);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "TOKEN_EXPIRED",
        reason: "token_expired",
      })
    );
    expect(next).not.toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain('"reason":"token_expired"');
    expect(warnSpy.mock.calls[0][0]).not.toContain(expiredToken);
  });

  it("retorna 401 INVALID_TOKEN quando a assinatura do JWT é inválida", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const forgedToken = jwt.sign({ sub: "user-123" }, "wrong-secret", { expiresIn: "1h" });
    const { req, res, next } = createMockReqRes(`Bearer ${forgedToken}`);

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "INVALID_TOKEN",
        reason: "invalid_token",
      })
    );
    expect(next).not.toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain('"reason":"invalid_token"');
    expect(warnSpy.mock.calls[0][0]).not.toContain(forgedToken);
  });

  it("chama next() e popula req.user quando o JWT é válido", () => {
    const validToken = jwt.sign({ sub: "user-123", email: "anne@estuda.com" }, TEST_SECRET, {
      expiresIn: "1h",
    });
    const { req, res, next } = createMockReqRes(`Bearer ${validToken}`);

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.user).toMatchObject({ sub: "user-123", email: "anne@estuda.com" });
  });
});
```

### 2. Comandos de Gate no Backend
Executar no pacote do serviço `Auth` (e `BFF`, se alterado):
```bash
pnpm --filter auth lint
pnpm --filter auth typecheck
pnpm --filter auth test
```
*(Ou os scripts equivalentes definidos no `package.json` de `/srv/estuda-anne`)*
