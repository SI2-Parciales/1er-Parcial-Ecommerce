import { SetMetadata } from '@nestjs/common';
import { PUBLIC_ROUTE_KEY } from '../auth.constants.js';

/** Permite acceder a una ruta sin iniciar sesión. Úsalo solo cuando sea necesario. */
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);
