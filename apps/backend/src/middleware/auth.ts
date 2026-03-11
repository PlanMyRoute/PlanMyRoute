// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';

/**
 * Interfaz extendida de Request para incluir el userId
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: { id: string; email?: string };
    }
  }
}

/**
 * Middleware para verificar el token JWT de Supabase
 * Extrae el token del header Authorization y lo valida con Supabase
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token no proporcionado o formato inválido',
        message: 'Use "Authorization: Bearer <token>"'
      });
    }

    const token = authHeader.substring(7); // Remover "Bearer " del inicio

    // Verificar el token con Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: 'Token inválido o expirado',
        details: error?.message
      });
    }

    // Adjuntar el userId al request para usarlo en los controladores
    req.userId = data.user.id;
    req.user = {
      id: data.user.id,
      email: data.user.email
    };

    next();
  } catch (err) {
    console.error('Error verificando token:', err);
    return res.status(500).json({
      error: 'Error al verificar el token'
    });
  }
}

/**
 * Middleware para verificar que el usuario solo puede acceder a su propia información
 * Se debe usar después de verifyToken
 */
export function requireSameUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    const paramUserId = req.params.id || req.params.userId;

    if (!userId) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    // Permitir que el usuario acceda solo a su propia información
    if (userId !== paramUserId) {
      return res.status(403).json({
        error: 'No tienes permiso para acceder a esta información',
        message: 'Solo puedes ver tu propia información'
      });
    }

    next();
  } catch (err) {
    console.error('Error en requireSameUser:', err);
    return res.status(500).json({
      error: 'Error al verificar permisos'
    });
  }
}

/**
 * Middleware opcional para obtener el userId si está disponible
 * No rechaza si no hay token, solo lo ignora
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data } = await supabase.auth.getUser(token);
      
      if (data.user) {
        req.userId = data.user.id;
        req.user = {
          id: data.user.id,
          email: data.user.email
        };
      }
    }
  } catch (err) {
    console.error('Error en optionalAuth:', err);
    // No rechazamos, solo ignoramos el error
  }
  
  next();
}
