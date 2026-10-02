import test, { mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { Track } from "../src/models/Track.js";

/*
 * Tests de contrat et de sécurité de l'API (extension facultative du TP3).
 * Aucune route n'est modifiée et MongoDB n'est jamais contacté :
 *  - les refus d'authentification et de validation se produisent AVANT toute
 *    requête en base ;
 *  - pour la pagination et la propriété des pistes, les méthodes du modèle
 *    Track sont remplacées par des « mocks » qui enregistrent leurs arguments :
 *    on vérifie ainsi quelle requête serait envoyée à MongoDB.
 */

// Même valeur par défaut que backend/src/app.js ; les tests signent leurs propres jetons.
const SECRET = process.env.JWT_SECRET || "tp1-development-secret";
const USER_A = "64b000000000000000000001";
const USER_B = "64b000000000000000000002";

const tokenFor = (sub) => jwt.sign({ sub, email: `${sub}@example.com` }, SECRET, { expiresIn: "1h" });
const bearer = (token) => ({ Authorization: `Bearer ${token}` });

let server, base;

test.before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());
test.afterEach(() => mock.restoreAll());

// ---- 401 : authentification ----------------------------------------------

test("401 sans JWT sur toutes les routes de pistes", async () => {
  const routes = [
    ["GET", "/api/tracks"],
    ["POST", "/api/tracks"],
    ["GET", "/api/tracks/abc/audio"],
    ["DELETE", "/api/tracks/abc"],
  ];

  for (const [method, url] of routes) {
    const response = await fetch(base + url, { method });
    assert.equal(response.status, 401, `${method} ${url}`);
    assert.equal((await response.json()).message, "Authentification requise");
  }
});

test("401 avec un en-tête Authorization sans le préfixe Bearer", async () => {
  const response = await fetch(base + "/api/tracks", {
    headers: { Authorization: tokenFor(USER_A) },
  });
  assert.equal(response.status, 401);
});

test("401 avec un JWT invalide (texte quelconque)", async () => {
  const response = await fetch(base + "/api/tracks", { headers: bearer("pas-un-jwt") });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Jeton invalide ou expiré");
});

test("401 avec un JWT signé par un autre secret (falsifié)", async () => {
  const forged = jwt.sign({ sub: USER_A }, "mauvais-secret");
  const response = await fetch(base + "/api/tracks", { headers: bearer(forged) });
  assert.equal(response.status, 401);
});

test("401 avec un JWT expiré", async () => {
  const expired = jwt.sign({ sub: USER_A }, SECRET, { expiresIn: -10 });
  const response = await fetch(base + "/api/tracks", { headers: bearer(expired) });
  assert.equal(response.status, 401);
});

// ---- 400 : validation de l'upload ----------------------------------------

test("upload sans fichier : 400 « Fichier audio requis »", async () => {
  const form = new FormData();
  form.append("title", "Sans fichier");

  const response = await fetch(base + "/api/tracks", {
    method: "POST",
    headers: bearer(tokenFor(USER_A)),
    body: form,
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Fichier audio requis");
});

test("upload d'un type MIME refusé (text/plain) : 400 « Format audio non accepté »", async () => {
  const form = new FormData();
  form.append("audio", new Blob(["pas de la musique"], { type: "text/plain" }), "notes.txt");

  const response = await fetch(base + "/api/tracks", {
    method: "POST",
    headers: bearer(tokenFor(USER_A)),
    body: form,
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Format audio non accepté");
});

// ---- Pagination -----------------------------------------------------------

/** Remplace Track.find / countDocuments et enregistre les arguments reçus. */
function mockTrackQueries(total, items = []) {
  const seen = {};
  mock.method(Track, "find", (filter) => {
    seen.filter = filter;
    const query = {
      sort: () => query,
      skip: (n) => ((seen.skip = n), query),
      limit: (n) => ((seen.limit = n), query),
      select: () => query,
      lean: async () => items,
    };
    return query;
  });
  mock.method(Track, "countDocuments", async (filter) => {
    seen.countFilter = filter;
    return total;
  });
  return seen;
}

test("pagination : page et limit sont traduits en skip/limit et renvoyés avec le total", async () => {
  const seen = mockTrackQueries(12);

  const response = await fetch(base + "/api/tracks?page=2&limit=5", { headers: bearer(tokenFor(USER_A)) });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(seen.skip, 5); // (page - 1) * limit
  assert.equal(seen.limit, 5);
  assert.deepEqual(
    { page: body.page, limit: body.limit, total: body.total, pages: body.pages },
    { page: 2, limit: 5, total: 12, pages: 3 },
  );
});

test("pagination : valeurs absurdes ramenées à des bornes sûres (page 1, limit 20 max)", async () => {
  const seen = mockTrackQueries(0);

  const response = await fetch(base + "/api/tracks?page=-3&limit=500", { headers: bearer(tokenFor(USER_A)) });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.page, 1);
  assert.equal(body.limit, 20);
  assert.equal(seen.skip, 0);
});

// ---- Propriété des pistes -------------------------------------------------

test("la liste est toujours filtrée par le propriétaire du JWT, jamais par un paramètre client", async () => {
  const seen = mockTrackQueries(0);

  // Un client malveillant tente de lire les pistes d'un autre utilisateur.
  await fetch(base + `/api/tracks?ownerId=${USER_B}`, { headers: bearer(tokenFor(USER_A)) });

  assert.equal(seen.filter.ownerId, USER_A);
  assert.equal(seen.countFilter.ownerId, USER_A);
});

test("supprimer la piste d'un autre utilisateur : la requête est limitée à MON ownerId, réponse 404", async () => {
  let filterUsed;
  // Mongo ne trouve rien car la piste appartient à USER_A et on cherche avec USER_B.
  mock.method(Track, "findOneAndDelete", (filter) => {
    filterUsed = filter;
    return { select: async () => null };
  });

  const response = await fetch(base + "/api/tracks/64c0000000000000000000aa", {
    method: "DELETE",
    headers: bearer(tokenFor(USER_B)),
  });

  assert.equal(response.status, 404); // 404 et non 403 : on ne révèle pas que la piste existe
  assert.equal((await response.json()).message, "Piste inconnue");
  assert.equal(filterUsed._id, "64c0000000000000000000aa");
  assert.equal(filterUsed.ownerId, USER_B);
});

test("lire l'audio d'un autre utilisateur : filtré par ownerId, réponse 404", async () => {
  let filterUsed;
  mock.method(Track, "findOne", (filter) => {
    filterUsed = filter;
    return { select: async () => null };
  });

  const response = await fetch(base + "/api/tracks/64c0000000000000000000aa/audio", {
    headers: bearer(tokenFor(USER_B)),
  });

  assert.equal(response.status, 404);
  assert.equal(filterUsed.ownerId, USER_B);
});
