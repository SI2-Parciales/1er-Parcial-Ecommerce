import { SetMetadata } from '@nestjs/common';
import { ActorRole, MINIMUM_ROLE_KEY } from '../auth.constants.js';

/** Exige este nivel o uno superior de la jerarquía de actores. */
export const MinRole = (role: ActorRole) => SetMetadata(MINIMUM_ROLE_KEY, role);
