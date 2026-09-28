import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../../../common/constants/injection-tokens';
import type { User } from '../../../users/domain/entities/user.entity';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';

export interface UpdateProfileCommand {
  name: string;
}

/**
 * Use-case: editar los datos del perfil. Por ahora solo el nombre.
 *
 * El correo NO se puede cambiar aquí a propósito: es el identificador de la
 * cuenta y el destino de los avisos de seguridad. Cambiarlo exige confirmar
 * el correo nuevo (un enlace de verificación), que es otro flujo.
 */
@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string, command: UpdateProfileCommand): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.userRepository.updateName(userId, command.name.trim());
  }
}
