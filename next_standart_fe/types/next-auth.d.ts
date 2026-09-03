import 'next-auth';
import 'next-auth/jwt';
import { UserRole } from './layout';

declare module 'next-auth' {
    interface User {
        id?: string;
        role?: string;
        user_code?: string;
        username?: string;
        name?: string;
        remember_me?: boolean;
        access_token?: string;
        refresh_token?: string;
    }

    interface Session {
        user: {
            id?: string;
            role?: string;
            user_code?: string;
            name?: string;
            username?: string;
        };
        remember_me?: boolean; 
        access_token?: string;
        refresh_token?: string;
        error?: string;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id?: string;
        role?: string;
        user_code?: string;
        username?: string;
        name?: string;
        access_token?: string;
        refresh_token?: string;
        access_token_expires?: number;
        error?: string;
        remember_me?: boolean; 
    }
}

export interface UserCredential {
    user_code: string;
    username: string;
    fullname: string;
    role: UserRole;
}