import { mockDb } from '@core/mock/mock-db';
import type { UserSession } from '@core/types';

export interface CreateUserPayload extends Omit<UserSession, 'id'> {
  password?: string;
}

export const userService = {
  async getUsers(): Promise<UserSession[]> {
    return mockDb.getUsers();
  },

  async createUser(payload: CreateUserPayload): Promise<UserSession> {
    return mockDb.createUser(payload);
  },

  async updateUser(id: string, payload: Partial<CreateUserPayload>): Promise<UserSession> {
    return mockDb.updateUser(id, payload);
  },

  async deleteUser(id: string): Promise<void> {
    return mockDb.deleteUser(id);
  },
};
