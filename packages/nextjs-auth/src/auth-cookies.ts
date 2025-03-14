import { cookies } from "next/headers.js";
export const AuthCookieNames = {
  LifeEventsAuthContext: "life-events-auth-context",
  LifeEventsUserInfo: "life-events-user-info",
} as const;

type AuthCookieValuesType =
  (typeof AuthCookieNames)[keyof typeof AuthCookieNames];

const COOKIE_LIFESPAN_SECONDS = 60 * 5;
export const LifeEventsAuthCookies = {
  set(options: {
    name: AuthCookieValuesType;
    value: string;
    secure: boolean;
  }): void {
    const expirationDatetime = new Date();
    expirationDatetime.setSeconds(
      expirationDatetime.getSeconds() + COOKIE_LIFESPAN_SECONDS,
    );
    cookies().set({
      name: options.name,
      value: options.value,
      secure: options.secure,
      expires: expirationDatetime,
    });
  },
  has(name: AuthCookieValuesType): boolean {
    return cookies().has(name);
  },
  delete(name: AuthCookieValuesType): void {
    cookies().delete(name);
  },
  get<T>(name: AuthCookieValuesType): T | undefined {
    const cookie = cookies().get(name);
    if (!cookie) {
      return undefined;
    }
    return JSON.parse(cookie.value) as T;
  },
  clear() {
    this.delete(AuthCookieNames.LifeEventsAuthContext);
    this.delete(AuthCookieNames.LifeEventsUserInfo);
  },
};
