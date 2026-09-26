import { Module } from '@nestjs/common';
import { LOCATION_DIRECTORY } from '../../common/constants/injection-tokens';
import { GeoNamesLocationDirectory } from './infrastructure/geonames-location-directory';
import { LocationsResolver } from './presentation/locations.resolver';

/**
 * Países y ciudades de envío. Lo usa el formulario del checkout (combobox)
 * y el módulo de pedidos para VALIDAR la dirección en el servidor.
 */
@Module({
  providers: [
    { provide: LOCATION_DIRECTORY, useClass: GeoNamesLocationDirectory },
    LocationsResolver,
  ],
  exports: [LOCATION_DIRECTORY],
})
export class LocationsModule {}
