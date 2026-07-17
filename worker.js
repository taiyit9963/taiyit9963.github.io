// LOUSBITE — Admin API con contraseña
// Lee y escribe archivos JSON del repo via GitHub API.

const REPO = 'DiegoCrUz-afk/pruebaLousBites.github.io';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function b64utf8(str) {
  // Codifica UTF-8 → base64
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function utf8b64(base64) {
  // Decodifica base64 → UTF-8
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    const url = new URL(request.url);
    const path = url.pathname;

    // ───── LOGIN ─────
    if (path === '/api/login' && request.method === 'POST') {
      const { password } = await request.json();
      if (password !== env.ADMIN_PASSWORD) {
        return json({ error: 'Contraseña incorrecta' }, 401);
      }
      // Devolvemos un token simple (la contraseña misma se usa como token)
      return json({ success: true });
    }

    // ───── DATOS ─────
    const match = path.match(/^\/api\/data\/(productos|posts|calendario)$/);
    if (!match) return json({ error: 'Endpoint no encontrado' }, 404);

    // Verificar auth
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ') || auth.slice(7) !== env.ADMIN_PASSWORD) {
      return json({ error: 'No autorizado' }, 401);
    }

    const collection = match[1];
    const filePath = `data/${collection}.json`;

    const gh = {
      headers: {
        Authorization: `Bearer ${env.GIT_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'lousbite-admin',
      },
    };

    // ───── GET: leer archivo ─────
    if (request.method === 'GET') {
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${filePath}`,
        gh,
      );

      if (res.status === 404) {
        // Archivo no existe aún → devolver estructura vacía
        return json({ data: { lista: [] }, sha: null });
      }
      if (!res.ok) {
        return json({ error: 'Error al leer archivo', status: res.status }, 500);
      }

      const file = await res.json();
      const content = JSON.parse(utf8b64(file.content));
      return json({ data: content, sha: file.sha });
    }

    // ───── POST: guardar archivo ─────
    if (request.method === 'POST') {
      const body = await request.json();
      const contentStr = JSON.stringify(body.data, null, 2);
      const encoded = b64utf8(contentStr);

      const putBody = {
        message: `📝 Actualizar ${collection}`,
        content: encoded,
        branch: 'main',
      };
      if (body.sha) putBody.sha = body.sha;

      const res = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${filePath}`,
        {
          method: 'PUT',
          headers: { ...gh.headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(putBody),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        return json({
          error: 'Error al guardar en GitHub',
          detail: result.message || JSON.stringify(result),
        }, 500);
      }

      return json({
        success: true,
        sha: result.content?.sha,
        commit: result.commit?.sha,
      });
    }

    return json({ error: 'Método no soportado' }, 405);
  },
};
