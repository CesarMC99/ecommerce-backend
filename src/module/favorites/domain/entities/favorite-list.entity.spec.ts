import { FavoriteList, MAX_FAVORITES } from './favorite-list.entity';

describe('FavoriteList (reglas de favoritos)', () => {
  it('añade al principio: lo último guardado aparece primero', () => {
    const list = FavoriteList.empty('user-1').add('a').add('b');

    expect(list.productIds).toEqual(['b', 'a']);
  });

  it('volver a añadir uno existente lo sube arriba sin duplicarlo', () => {
    const list = FavoriteList.empty('user-1').add('a').add('b').add('a');

    expect(list.productIds).toEqual(['a', 'b']);
  });

  it('toggle añade si no está y quita si está', () => {
    const list = FavoriteList.empty('user-1').toggle('a');
    expect(list.has('a')).toBe(true);
    expect(list.toggle('a').has('a')).toBe(false);
  });

  it('merge pone primero los del invitado y no duplica', () => {
    const account = FavoriteList.empty('user-1').add('a').add('b'); // [b, a]

    expect(account.merge(['c', 'a']).productIds).toEqual(['c', 'a', 'b']);
  });

  it(`nunca supera ${MAX_FAVORITES} favoritos`, () => {
    const ids = Array.from({ length: MAX_FAVORITES + 20 }, (_, i) => `p-${i}`);

    expect(FavoriteList.empty('user-1').merge(ids).productIds).toHaveLength(
      MAX_FAVORITES,
    );
  });

  it('es inmutable', () => {
    const original = FavoriteList.empty('user-1').add('a');
    original.add('b');

    expect(original.productIds).toEqual(['a']);
  });
});
