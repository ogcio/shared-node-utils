import type { LogtoNextConfig } from "@logto/next";
import type { Logger } from "pino";
import type { GetContextParams, UserContext } from "./types.js";
import { UserContextHandler } from "./user-context-handler.js";

type UserInstance = {
  context: UserContext;
  lastAccessed: number;
};

export class UserSessionStore {
  private static instance: UserSessionStore;
  private userContexts: Map<string, UserInstance> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 1000 * 60 * 30); // 30 minutes
  }

  public static getInstance(): UserSessionStore {
    if (!UserSessionStore.instance) {
      UserSessionStore.instance = new UserSessionStore();
    }
    return UserSessionStore.instance;
  }

  public async getUserContext(
    config: LogtoNextConfig,
    getContextParameters: GetContextParams,
  ): Promise<UserContext | undefined> {
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
    return instance?.context;
  }

  public async createUserContext(
    config: LogtoNextConfig,
    getContextParameters: GetContextParams,
    logger: Logger,
  ): Promise<UserContext> {
    const instance: UserInstance = {
      context: new UserContextHandler(config, getContextParameters, logger),
      lastAccessed: Date.now(),
    };
    const user = await instance.context.getUser();
    if (!user) {
      throw new Error("Cannot get context with the requested config");
    }
    this.userContexts.set(user.id, instance);
    return instance.context;
  }

  public removeUserInstance(userId: string): void {
    this.userContexts.delete(userId);
  }

  private cleanup(): void {
    const now = Date.now();
    const expirationTime = 1000 * 60 * 60;

    for (const [userId, instance] of this.userContexts.entries()) {
      if (now - instance.lastAccessed > expirationTime) {
        this.removeUserInstance(userId);
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
