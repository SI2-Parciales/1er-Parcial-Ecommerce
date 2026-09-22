import { SetMetadata } from '@nestjs/common';
import { OPTIONAL_AUTH_ROUTE_KEY } from '../auth.constants.js';

/** Permite omitir el JWT, pero valida y carga al usuario cuando se envía uno. */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_ROUTE_KEY, true);
