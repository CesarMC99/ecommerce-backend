// El paquete no trae tipos: se declaran solo los campos que usamos
declare module 'all-the-cities' {
  interface GeoNamesCity {
    cityId: number;
    name: string;
    /** ISO 3166-1 alfa-2 */
    country: string;
    population: number;
  }
  const cities: GeoNamesCity[];
  export = cities;
}
