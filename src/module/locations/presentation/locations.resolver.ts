import { Inject } from '@nestjs/common';
import {
  Args,
  ArgsType,
  Field,
  Int,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { IsInt, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { LOCATION_DIRECTORY } from '../../../common/constants/injection-tokens';
import type { LocationDirectory } from '../domain/location-directory';

/** Máximo de ciudades por búsqueda: el combobox no necesita más. */
const MAX_CITY_RESULTS = 30;

@ObjectType('ShippingCountry')
export class ShippingCountryType {
  @Field({ description: 'Código ISO 3166-1 alfa-2 (ES, MX...)' })
  code: string;

  @Field({ description: 'Nombre en español' })
  name: string;

  @Field({ description: 'Prefijo telefónico sin "+" (34, 52...)' })
  dialCode: string;
}

@ObjectType('City')
export class CityType {
  @Field()
  name: string;

  @Field()
  countryCode: string;
}

@ArgsType()
export class SearchCitiesArgs {
  @Field()
  @IsString()
  @Length(2, 2, { message: 'El país no es válido' })
  countryCode: string;

  @Field({ defaultValue: '' })
  @IsString()
  @MaxLength(60)
  search: string;

  @Field(() => Int, { defaultValue: 20 })
  @IsInt()
  @Min(1)
  @Max(MAX_CITY_RESULTS)
  limit: number;
}

/**
 * Datos para el formulario de envío. Públicos: son datos geográficos, no
 * hay nada privado (y el checkout ya exige sesión por su cuenta).
 */
@Resolver()
export class LocationsResolver {
  constructor(
    @Inject(LOCATION_DIRECTORY)
    private readonly locationDirectory: LocationDirectory,
  ) {}

  @Query(() => [ShippingCountryType], {
    description: 'Países a los que envía la tienda',
  })
  shippingCountries(): ShippingCountryType[] {
    return this.locationDirectory.listCountries();
  }

  @Query(() => [CityType], {
    description: 'Busca ciudades de un país (sin distinguir tildes)',
  })
  searchCities(@Args() args: SearchCitiesArgs): CityType[] {
    return this.locationDirectory.searchCities(
      args.countryCode,
      args.search,
      args.limit,
    );
  }
}
