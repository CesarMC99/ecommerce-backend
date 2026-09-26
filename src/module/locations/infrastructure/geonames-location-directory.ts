import { Injectable, Logger } from '@nestjs/common';
import { getCountryCallingCode, type CountryCode } from 'libphonenumber-js';
import type {
  City,
  LocationDirectory,
  ShippingCountry,
} from '../domain/location-directory';
import { normalizeText } from '../domain/normalize-text';
import { SHIPPING_COUNTRY_CODES } from '../domain/shipping-countries';

/**
 * GeoNames usa el nombre internacional (en inglés) de algunas ciudades muy
 * grandes. Estas se muestran con su nombre en español, que es como las
 * buscará un cliente de la tienda. Clave: "PAÍS:nombre en GeoNames".
 */
const SPANISH_CITY_NAMES: Record<string, string> = {
  'MX:Mexico City': 'Ciudad de México',
  'US:New York City': 'Nueva York',
  'US:Philadelphia': 'Filadelfia',
  'GB:London': 'Londres',
  'GB:Edinburgh': 'Edimburgo',
  'DE:Munich': 'Múnich',
  'DE:Cologne': 'Colonia',
  'PT:Lisbon': 'Lisboa',
  'IT:Rome': 'Roma',
  'IT:Milan': 'Milán',
  'IT:Naples': 'Nápoles',
  'IT:Turin': 'Turín',
  'IT:Florence': 'Florencia',
  'IT:Venice': 'Venecia',
  'BE:Brussels': 'Bruselas',
  'BE:Antwerp': 'Amberes',
  'NL:The Hague': 'La Haya',
  'AT:Vienna': 'Viena',
  'CZ:Prague': 'Praga',
  'PL:Warsaw': 'Varsovia',
  'GR:Athens': 'Atenas',
  'DK:Copenhagen': 'Copenhague',
  'SE:Stockholm': 'Estocolmo',
  'CH:Geneva': 'Ginebra',
  'CH:Zurich': 'Zúrich',
  'RO:Bucharest': 'Bucarest',
  'FR:Marseille': 'Marsella',
};

interface CityEntry {
  name: string;
  /** Nombre sin tildes y en minúsculas, para buscar */
  key: string;
  population: number;
}

/**
 * Directorio basado en GeoNames (paquete `all-the-cities`: ~135.000
 * ciudades de más de 1.000 habitantes, licencia CC-BY).
 *
 * Los datos pesan varios MB, por eso viven en el BACKEND y no en el
 * navegador: el combobox pregunta "ciudades de ES que contienen 'mal'" y
 * recibe 20 resultados. Se cargan la primera vez que hacen falta (así la
 * API arranca igual de rápido) y se quedan en memoria, ya indexados por
 * país y ordenados por población (las ciudades grandes salen primero).
 */
@Injectable()
export class GeoNamesLocationDirectory implements LocationDirectory {
  private readonly logger = new Logger(GeoNamesLocationDirectory.name);
  private citiesByCountry: Map<string, CityEntry[]> | null = null;
  private countries: ShippingCountry[] | null = null;

  listCountries(): ShippingCountry[] {
    if (!this.countries) {
      // Intl.DisplayNames traduce el código ISO al nombre en español
      // ('DE' → 'Alemania') sin mantener una lista de nombres a mano
      const names = new Intl.DisplayNames(['es'], { type: 'region' });
      const withCities = this.getIndex();
      this.countries = SHIPPING_COUNTRY_CODES.filter((code) =>
        withCities.has(code),
      )
        .map((code) => ({
          code,
          name: names.of(code) ?? code,
          dialCode: getCountryCallingCode(code as CountryCode),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    return this.countries;
  }

  findCountry(code: string): ShippingCountry | null {
    return (
      this.listCountries().find((country) => country.code === code) ?? null
    );
  }

  searchCities(countryCode: string, search: string, limit: number): City[] {
    const cities = this.getIndex().get(countryCode) ?? [];
    const query = normalizeText(search);
    if (!query) {
      return cities.slice(0, limit).map((city) => toCity(city, countryCode));
    }
    // Primero las que EMPIEZAN por lo escrito ("mad" → Madrid) y después
    // las que lo contienen ("mad" → Pozo de Madrid): lo esperable al teclear
    const startsWith: CityEntry[] = [];
    const contains: CityEntry[] = [];
    for (const city of cities) {
      if (city.key.startsWith(query)) startsWith.push(city);
      else if (city.key.includes(query)) contains.push(city);
      if (startsWith.length >= limit) break;
    }
    return [...startsWith, ...contains]
      .slice(0, limit)
      .map((city) => toCity(city, countryCode));
  }

  findCity(countryCode: string, name: string): City | null {
    const key = normalizeText(name);
    const city = this.getIndex()
      .get(countryCode)
      ?.find((entry) => entry.key === key);
    return city ? toCity(city, countryCode) : null;
  }

  /** Carga e indexa los datos la primera vez (unos cientos de ms). */
  private getIndex(): Map<string, CityEntry[]> {
    if (this.citiesByCountry) return this.citiesByCountry;

    // require y no import: el paquete decodifica un archivo binario al
    // cargarse. Con require eso ocurre AQUÍ, no al arrancar la API
    const allCities =
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('all-the-cities') as typeof import('all-the-cities');
    const allowed = new Set(SHIPPING_COUNTRY_CODES);
    const index = new Map<string, Map<string, CityEntry>>();

    for (const city of allCities) {
      if (!allowed.has(city.country)) continue;
      const byName = index.get(city.country) ?? new Map<string, CityEntry>();
      index.set(city.country, byName);
      const name =
        SPANISH_CITY_NAMES[`${city.country}:${city.name}`] ?? city.name;
      const key = normalizeText(name);
      // Nombres repetidos en un país (hay varios "Villanueva"): como solo
      // guardamos el nombre, se deja una entrada (la más poblada)
      const existing = byName.get(key);
      if (!existing || existing.population < city.population) {
        byName.set(key, { name, key, population: city.population });
      }
    }

    this.citiesByCountry = new Map(
      [...index].map(([country, byName]) => [
        country,
        [...byName.values()].sort((a, b) => b.population - a.population),
      ]),
    );
    this.logger.log(
      `Ciudades cargadas para ${this.citiesByCountry.size} países`,
    );
    return this.citiesByCountry;
  }
}

const toCity = (entry: CityEntry, countryCode: string): City => ({
  name: entry.name,
  countryCode,
});
