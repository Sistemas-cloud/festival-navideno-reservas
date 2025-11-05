/**
 * Usuarios internos/administradores por función
 * Estos usuarios no dependen de la base de datos y pueden reservar sin restricciones
 * en su función asignada.
 */

export interface InternalUser {
  control: number;
  password: string;
  nombre: string;
  funcion: number; // 1, 2, o 3
  descripcion: string;
}

export const INTERNAL_USERS: InternalUser[] = [
  {
    control: 9001,
    password: 'AdminFuncion1',
    nombre: 'Administrador Función 1',
    funcion: 1,
    descripcion: 'Usuario interno para reservas de la 1ra Función (Maternal + Kinder + 1° primaria)'
  },
  {
    control: 9002,
    password: 'AdminFuncion2',
    nombre: 'Administrador Función 2',
    funcion: 2,
    descripcion: 'Usuario interno para reservas de la 2da Función (2°-5° primaria)'
  },
  {
    control: 9003,
    password: 'AdminFuncion3',
    nombre: 'Administrador Función 3',
    funcion: 3,
    descripcion: 'Usuario interno para reservas de la 3ra Función (6° primaria + Secundaria)'
  }
];

/**
 * Busca un usuario interno por número de control
 */
export function findInternalUser(control: number): InternalUser | undefined {
  return INTERNAL_USERS.find(user => user.control === control);
}

/**
 * Valida las credenciales de un usuario interno
 */
export function validateInternalUser(control: number, password: string): InternalUser | null {
  const user = findInternalUser(control);
  if (user && user.password === password) {
    return user;
  }
  return null;
}

/**
 * Verifica si un número de control pertenece a un usuario interno
 */
export function isInternalUser(control: number): boolean {
  return INTERNAL_USERS.some(user => user.control === control);
}

