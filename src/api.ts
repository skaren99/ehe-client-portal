import { UserManager, WebStorageStateStore } from "oidc-client-ts";
const origin = window.location.origin;
export const auth = new UserManager({
  authority:
    import.meta.env.VITE_OIDC_AUTHORITY || "http://localhost:8180/realms/ehe",
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID || "ehe-client-portal",
  redirect_uri:
    import.meta.env.VITE_OIDC_REDIRECT_URI || origin + "/auth/callback",
  post_logout_redirect_uri:
    import.meta.env.VITE_OIDC_LOGOUT_URI || origin + "/",
  response_type: "code",
  scope: "openid profile email",
  automaticSilentRenew: false,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
});
let callback: Promise<void> | undefined;
export function finishAuth(): Promise<void> {
  if (location.pathname !== "/auth/callback") return Promise.resolve();
  return (callback ??= auth.signinRedirectCallback().then(() => {
    history.replaceState({}, "", "/");
  }));
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const user = await auth.getUser();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (user && !user.expired)
    headers.Authorization = "Bearer " + user.access_token;
  const response = await fetch((import.meta.env.VITE_API_BASE || "") + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      response.status === 401
        ? "Seanss aegus. Logi uuesti sisse."
        : result.message || "Päring ebaõnnestus (" + response.status + ").",
    );
  return result;
}
