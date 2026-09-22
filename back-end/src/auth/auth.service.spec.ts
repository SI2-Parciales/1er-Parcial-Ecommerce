import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesService } from '../roles/roles.service.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const password = 'EjemploSeguro123!';

describe('AuthService', () => {
  const usersService = {
    findByEmail: vi.fn(),
    create: vi.fn(),
  };
  const rolesService = { findByNombre: vi.fn() };
  const jwtService = { sign: vi.fn(() => 'jwt-token') };
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      usersService as unknown as UsersService,
      rolesService as unknown as RolesService,
      jwtService as unknown as JwtService,
    );
  });

  it('registra un cliente, guarda un hash y devuelve datos públicos', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    rolesService.findByNombre.mockResolvedValue({ id: 1, nombre: 'CLIENTE' });
    usersService.create.mockImplementation(async (input) => ({
      id: 10,
      ...input,
      rol: { nombre: 'CLIENTE' },
    }));

    const result = await service.register({
      nombre: 'Juan',
      apellido: 'Perez',
      telefono: '73168919',
      email: ' JUAN@EXAMPLE.COM ',
      password,
    });

    const creation = usersService.create.mock.calls[0][0];
    expect(creation.email).toBe('juan@example.com');
    expect(creation.rolId).toBe(1);
    expect(creation.estado).toBe('ACTIVO');
    expect(creation.passwordHash).not.toBe(password);
    expect(await argon2.verify(creation.passwordHash, password)).toBe(true);
    expect(result).toEqual({
      message: 'Registro exitoso.',
      user: {
        id: 10,
        nombre: 'Juan',
        apellido: 'Perez',
        telefono: '73168919',
        email: 'juan@example.com',
        estado: 'ACTIVO',
        rol: 'CLIENTE',
      },
      accessToken: 'jwt-token',
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 10, role: 'CLIENTE' });
  });

  it('rechaza un correo ya registrado incluso si la restricción falla al crear', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    rolesService.findByNombre.mockResolvedValue({ id: 1 });
    usersService.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.register({
        nombre: 'Juan',
        apellido: 'Perez',
        telefono: '73168919',
        email: 'juan@example.com',
        password,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza credenciales incorrectas y cuentas inactivas con el mismo error', async () => {
    usersService.findByEmail.mockResolvedValue(null);
    await expect(service.login({ email: 'no@example.com', password })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    usersService.findByEmail.mockResolvedValue({ estado: 'INACTIVO' });
    await expect(service.login({ email: 'no@example.com', password })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('inicia sesión y firma un JWT con el identificador y rol', async () => {
    const passwordHash = await argon2.hash(password);
    usersService.findByEmail.mockResolvedValue({
      id: 10,
      nombre: 'Juan',
      apellido: 'Perez',
      telefono: '73168919',
      email: 'juan@example.com',
      passwordHash,
      estado: 'ACTIVO',
      rol: { nombre: 'CLIENTE' },
    });

    const result = await service.login({ email: 'JUAN@EXAMPLE.COM', password });

    expect(result.accessToken).toBe('jwt-token');
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 10, role: 'CLIENTE' });
  });
});
