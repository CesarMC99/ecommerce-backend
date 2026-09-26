import { ArgsType, Field, ID } from '@nestjs/graphql';
import { ArrayMaxSize, IsMongoId } from 'class-validator';
import { MAX_FAVORITES } from '../../domain/entities/favorite-list.entity';

@ArgsType()
export class ToggleFavoriteArgs {
  @Field(() => ID)
  @IsMongoId({ message: 'El producto no es válido' })
  productId: string;
}

@ArgsType()
export class MergeFavoritesArgs {
  @Field(() => [ID])
  @ArrayMaxSize(MAX_FAVORITES, {
    message: `No se pueden guardar más de ${MAX_FAVORITES} favoritos`,
  })
  @IsMongoId({ each: true, message: 'Algún producto no es válido' })
  productIds: string[];
}
