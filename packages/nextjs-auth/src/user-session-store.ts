import type { LogtoNextConfig } from "@logto/next";
import type { Logger } from "pino";
import type { GetContextParams, UserContext } from "./types.js";
import { UserContextHandler } from "./user-context-handler.js";

export type UserSessionInstance<T> = {
  context: UserContext;
  lastAccessed: number;
  additionalInstance?: T;
};

export class UserSessionStore<T> {
  private userContexts: Map<string, UserSessionInstance<T>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 1000 * 60 * 30); // 30 minutes
  }

  private static instance: UserSessionStore<unknown>;
  public static getInstance<T>(): UserSessionStore<T> {
    if (!UserSessionStore.instance) {
      UserSessionStore.instance =
        new UserSessionStore<T>() as UserSessionStore<unknown>;
    }
    return UserSessionStore.instance as UserSessionStore<T>;
  }

  public async getUserInstance(
    config: LogtoNextConfig,
    getContextParameters: GetContextParams,
  ): Promise<UserSessionInstance<T> | undefined> {
    const userId = await UserContextHandler.loadLoggedUser(
      config,
      getContextParameters,
      false,
    );
    if (!userId) {
      return undefined;
    }

    const instance = this.userContexts.get(userId);

    if (!instance) {
      return undefined;
    }

    instance.lastAccessed = Date.now();
    return instance;
  }

  public async createUserInstance(
    config: LogtoNextConfig,
    getContextParameters: GetContextParams,
    logger: Logger,
    additionalInstanceToStore?: T,
  ): Promise<UserSessionInstance<T>> {
    const instance: UserSessionInstance<T> = {
      context: new UserContextHandler(config, getContextParameters, logger),
      lastAccessed: Date.now(),
      additionalInstance: additionalInstanceToStore,
    };
    const user = await instance.context.getUser();
    if (!user) {
      throw new Error("Cannot get context with the requested config");
    }
    this.userContexts.set(user.id, instance);
    return instance;
  }

  public removeUserContext(userId: string): void {
    this.userContexts.delete(userId);
  }

  private cleanup(): void {
    const now = Date.now();
    const expirationTime = 1000 * 60 * 60;

    for (const [userId, instance] of this.userContexts.entries()) {
      if (now - instance.lastAccessed > expirationTime) {
        this.removeUserContext(userId);
      }
    }
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.userContexts.clear();
  }
}
