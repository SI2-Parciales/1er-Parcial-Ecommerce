import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { RolesService } from '../roles/roles.service.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { AuthResponse, PublicUser, UserWithRole } from './auth.types.js';

const ACTIVE_STATUS = 'ACTIVO';
const CLIENT_ROLE = 'CLIENTE';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const clientRole = await this.rolesService.findByNombre(CLIENT_ROLE);
    if (!clientRole) {
      throw new InternalServerErrorException('No fue posible completar el registro.');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.usersService.create({
        nombre: dto.nombre.trim(),
        apellido: dto.apellido.trim(),
        telefono: dto.telefono.trim(),
        email,
        passwordHash,
        estado: ACTIVE_STATUS,
        rolId: clientRole.id,
      });

      return this.buildResponse('Registro exitoso.', user);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('El correo electrónico ya está registrado.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(this.normalizeEmail(dto.email));

    if (!user || user.estado !== ACTIVE_STATUS) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    return this.buildResponse('Inicio de sesión exitoso.', user);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private buildResponse(message: string, user: UserWithRole): AuthResponse {
    const publicUser: PublicUser = {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      telefono: user.telefono,
      email: user.email,
      estado: user.estado,
      rol: user.rol.nombre,
    };

    return {
      message,
      user: publicUser,
      accessToken: this.jwtService.sign({ sub: user.id, role: user.rol.nombre }),
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
