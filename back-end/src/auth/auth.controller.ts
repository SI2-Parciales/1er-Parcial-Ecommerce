import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { Public } from './decorators/public.decorator.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Registrar un cliente' })
  @ApiCreatedResponse({ description: 'Cliente registrado correctamente.', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos o campos no permitidos.' })
  @ApiConflictResponse({ description: 'El correo electrónico ya está registrado.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiOkResponse({ description: 'Autenticación correcta.', type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'Datos inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas o cuenta inactiva.' })
  @ApiTooManyRequestsResponse({ description: 'Se excedió el límite de cinco intentos por minuto.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
