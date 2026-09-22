import { describe, expect, it } from 'vitest';
import { DEFAULT_CORS_ORIGINS, resolveCorsOrigins } from './cors.config.js';

describe('resolveCorsOrigins', () => {
  it('usa los orígenes locales de React cuando no se configura una lista', () => {
    expect(resolveCorsOrigins()).toEqual([...DEFAULT_CORS_ORIGINS]);
  });

  it('normaliza y elimina orígenes repetidos configurados', () => {
    expect(
      resolveCorsOrigins(
        ' https://app.fashionstore.example/ , http://localhost:5173, https://app.fashionstore.example ',
      ),
    ).toEqual(['https://app.fashionstore.example', 'http://localhost:5173']);
  });

  it.each(['', 'ftp://frontend.example', 'https://frontend.example/ruta'])(
    'rechaza el origen inválido %s',
    (origin) => {
      expect(() => resolveCorsOrigins(origin)).toThrow(/CORS_ORIGINS/);
    },
  );
});
