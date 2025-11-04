import { Response } from 'express';
import { supabase } from '../db';
import { AuthRequest } from '../types/auth.types';

/**
 * Get all users (admin only)
 * GET /users
 */
export async function getAllUsers(_req: AuthRequest, res: Response) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            users: data,
            count: data.length,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

/**
 * Create new user (admin only - for manual user creation)
 * POST /users
 */
export async function createUser(req: AuthRequest, res: Response) {
    try {
        const { name, wallet_address } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Name is required',
            });
        }

        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    name,
                    wallet_address: wallet_address || null,
                },
            ])
            .select();

        if (error) throw error;

        return res.json({
            success: true,
            user: data[0],
        });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({
            success: false,
            error: (error as Error).message,
        });
    }
}

