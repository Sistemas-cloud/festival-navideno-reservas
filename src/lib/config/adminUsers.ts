/**
 * Configuración de usuarios administrativos
 * Cada usuario tiene acceso solo a su función correspondiente
 * El usuario 'admin' tiene acceso a todas las funciones
 */

export interface AdminUser {
  username: string;
  password: string;
  funcion?: number; // 1, 2, o 3. Si es undefined, tiene acceso a todas (admin)
  nombre: string;
  descripcion: string;
}

export const ADMIN_USERS: AdminUser[] = [
  {
    username: 'admin',
    password: 'Admin2025.',
    nombre: 'Administrador General',
    descripcion: 'Acceso completo a todas las funciones y secciones'
  },
  {
    username: 'kinder',
    password: 'Kinder2025!',
    funcion: 1,
    nombre: 'Administrador Función 1',
    descripcion: 'Acceso solo a la Función 1 (Kinder)'
  },
  {
    username: 'primaria',
    password: 'Primaria2025!',
    funcion: 2,
    nombre: 'Administrador Función 2',
    descripcion: 'Acceso solo a la Función 2 (Primaria)'
  },
  {
    username: 'secundaria',
    password: 'Secundaria2025!',
    funcion: 3,
    nombre: 'Administrador Función 3',
    descripcion: 'Acceso solo a la Función 3 (Secundaria)'
  }
];

/**
 * Busca un usuario admin por nombre de usuario
 */
export function findAdminUser(username: string): AdminUser | undefined {
  return ADMIN_USERS.find(user => user.username.toLowerCase() === username.toLowerCase());
}

/**
 * Valida las credenciales de un usuario admin
 */
export function validateAdminCredentials(username: string, password: string): AdminUser | null {
  const user = findAdminUser(username);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

/**
 * Verifica si un usuario tiene acceso a una función específica
 */
export function canAccessFunction(user: AdminUser, funcion: number): boolean {
  // Admin tiene acceso a todas las funciones
  if (!user.funcion) {
    return true;
  }
  // Otros usuarios solo tienen acceso a su función asignada
  return user.funcion === funcion;
}





