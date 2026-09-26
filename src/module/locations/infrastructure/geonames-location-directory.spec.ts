import { normalizePhone } from '../domain/phone-number';
import { GeoNamesLocationDirectory } from './geonames-location-directory';

// Usa los datos REALES de GeoNames: comprueba que el paquete se carga y
// que la búsqueda se comporta como espera el combobox
describe('GeoNamesLocationDirectory', () => {
  const directory = new GeoNamesLocationDirectory();

  it('lista países de América y Europa en español, con su prefijo', () => {
    const countries = directory.listCountries();

    expect(countries).toEqual(
      expect.arrayContaining([
        { code: 'ES', name: 'España', dialCode: '34' },
        { code: 'MX', name: 'México', dialCode: '52' },
        { code: 'US', name: 'Estados Unidos', dialCode: '1' },
      ]),
    );
    // Fuera de América y Europa, y países excluidos a propósito
    expect(directory.findCountry('JP')).toBeNull();
    expect(directory.findCountry('RU')).toBeNull();
  });

  it('busca sin distinguir tildes y pone primero las ciudades grandes', () => {
    const results = directory.searchCities('ES', 'mala', 5);

    expect(results[0]).toEqual({ name: 'Málaga', countryCode: 'ES' });
  });

  it('prioriza las que EMPIEZAN por lo escrito', () => {
    const results = directory.searchCities('ES', 'madrid', 5);
    expect(results[0].name).toBe('Madrid');
  });

  it('muestra en español las grandes ciudades que GeoNames da en inglés', () => {
    expect(directory.searchCities('MX', 'ciudad de mex', 1)[0].name).toBe(
      'Ciudad de México',
    );
    // Sin tilde también la encuentra (búsqueda insensible a tildes)
    expect(directory.findCity('DE', 'munich')?.name).toBe('Múnich');
  });

  it('valida una ciudad solo dentro de su país', () => {
    expect(directory.findCity('MX', 'guadalajara')?.name).toBe('Guadalajara');
    expect(directory.findCity('ES', 'Monterrey')).toBeNull();
    expect(directory.findCity('ES', 'Gotham')).toBeNull();
  });
});

describe('normalizePhone', () => {
  it.each([
    ['612 345 678', 'ES', '+34612345678'],
    ['55 1234 5678', 'MX', '+525512345678'],
    ['300 1234567', 'CO', '+573001234567'],
  ])('%s (%s) → %s', (phone, country, expected) => {
    expect(normalizePhone(phone, country)).toBe(expected);
  });

  it('rechaza números incompletos o de otro país', () => {
    expect(normalizePhone('123', 'ES')).toBeNull();
    expect(normalizePhone('+52 55 1234 5678', 'ES')).toBeNull();
  });
});
