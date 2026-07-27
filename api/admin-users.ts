import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient } from '@supabase/supabase-js';

type AppRole = 'Admin' | 'Gerente' | 'Vendedor';

interface CreateUserBody {
    id?: string;
    name?: string;
    email?: string;
    password?: string;
    role?: AppRole;
    sellerCode?: string;
    active?: boolean;
}

const sendJson = (response: ServerResponse, status: number, payload: unknown) => {
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
};

const readJsonBody = async (request: IncomingMessage): Promise<CreateUserBody> => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (chunks.length === 0) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as CreateUserBody;
};

export default async function handler(request: IncomingMessage, response: ServerResponse) {
    if (request.method !== 'POST' && request.method !== 'PATCH') {
        response.setHeader('Allow', 'POST, PATCH');
        sendJson(response, 405, { error: 'Método no permitido.' });
        return;
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        sendJson(response, 500, { error: 'La administración segura de usuarios no está configurada.' });
        return;
    }

    const authorization = request.headers.authorization || '';
    const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!accessToken) {
        sendJson(response, 401, { error: 'Sesión requerida.' });
        return;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
    if (authError || !authData.user?.email) {
        sendJson(response, 401, { error: 'La sesión no es válida.' });
        return;
    }

    let callerQuery = await adminClient
        .from('app_users')
        .select('role, active')
        .eq('id', authData.user.id)
        .maybeSingle();

    if (!callerQuery.data) {
        callerQuery = await adminClient
            .from('app_users')
            .select('role, active')
            .eq('email', authData.user.email)
            .maybeSingle();
    }

    const caller = callerQuery.data;
    if (callerQuery.error || !caller?.active || !['Admin', 'Gerente'].includes(caller.role)) {
        sendJson(response, 403, { error: 'No tienes permisos para crear usuarios.' });
        return;
    }

    let body: CreateUserBody;
    try {
        body = await readJsonBody(request);
    } catch {
        sendJson(response, 400, { error: 'El cuerpo de la solicitud no es válido.' });
        return;
    }

    if (request.method === 'PATCH') {
        if (!body.id || typeof body.active !== 'boolean') {
            sendJson(response, 400, { error: 'Usuario y estado son obligatorios.' });
            return;
        }
        if (body.id === authData.user.id && body.active === false) {
            sendJson(response, 400, { error: 'No puedes desactivar tu propio usuario.' });
            return;
        }

        const { data: updatedUser, error: updateError } = await adminClient
            .from('app_users')
            .update({ active: body.active })
            .eq('id', body.id)
            .select('id, name, email, role, sellerCode, active, createdAt')
            .single();

        if (updateError) {
            sendJson(response, 400, { error: updateError.message });
            return;
        }

        sendJson(response, 200, updatedUser);
        return;
    }

    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password || '';
    const role = body.role;
    const sellerCode = body.sellerCode?.trim().toUpperCase();

    if (!name || !email || !sellerCode || !role || !['Admin', 'Gerente', 'Vendedor'].includes(role)) {
        sendJson(response, 400, { error: 'Nombre, email, rol y código de vendedor son obligatorios.' });
        return;
    }
    if (password.length < 8) {
        sendJson(response, 400, { error: 'La contraseña debe tener al menos 8 caracteres.' });
        return;
    }

    const { data: existing } = await adminClient
        .from('app_users')
        .select('email, sellerCode')
        .or('email.eq.' + email + ',sellerCode.eq.' + sellerCode)
        .limit(1);

    if (existing && existing.length > 0) {
        sendJson(response, 409, { error: 'El email o código de vendedor ya está registrado.' });
        return;
    }

    const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name },
        app_metadata: { role, seller_code: sellerCode },
    });

    if (createAuthError || !createdAuth.user) {
        sendJson(response, 400, { error: createAuthError?.message || 'No se pudo crear el acceso.' });
        return;
    }

    const appUser = {
        id: createdAuth.user.id,
        name,
        email,
        role,
        sellerCode,
        active: body.active !== false,
        createdAt: new Date().toISOString(),
    };

    const { error: profileError } = await adminClient.from('app_users').insert(appUser);
    if (profileError) {
        await adminClient.auth.admin.deleteUser(createdAuth.user.id);
        sendJson(response, 400, { error: profileError.message });
        return;
    }

    sendJson(response, 201, appUser);
}
