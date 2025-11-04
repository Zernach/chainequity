/**
 * Users Handler
 * Handles user management operations
 */

import { BaseClient } from './base';
import type {
    CreateUserRequest,
    CreateUserResponse,
    GetUsersResponse,
} from '../types';

export class UsersHandler extends BaseClient {
    /**
     * Get all users
     */
    async getUsers(): Promise<GetUsersResponse> {
        return this.get<GetUsersResponse>('/users');
    }

    /**
     * Create a new user
     */
    async createUser(data: CreateUserRequest): Promise<CreateUserResponse> {
        return this.post<CreateUserResponse>('/users', data);
    }
}

