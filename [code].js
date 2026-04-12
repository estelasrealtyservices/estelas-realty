// api/og/[code].js — Vercel Edge Function
// Sirve meta tags OG dinámicos para bots de WhatsApp, Facebook, Twitter, etc.

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://uwifcvcnzeduovqrjhdf.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3aWZjdmNuemVkdW92cXJqaGRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzU4MjQsImV4cCI6MjA4OTcxMTgyNH0.QRuqmtMpCxGSasr8fvzDMcZtlYYTODLqeCaDQou9dP0';
const SITE_URL   = 'https://estelas-realty.vercel.app';
const FALLBACK_IMG = `${SITE_URL}/logo.png`;

export default async function handler(req) {
  const url  = new URL(req.url);
  const code = url.pathname.split('/').pop()?.toUpperCase();

  if (!code) return redirect(`${SITE_URL}/`);

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?code=eq.${encodeURIComponent(code)}&select=code,title,description,operation,type,zone,price,rooms,baths,size,parking,images&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    const data = await res.json();
    const p    = Array.isArray(data) ? data[0] : null;

    if (!p) return redirect(`${SITE_URL}/#propiedades`);

    const period      = p.operation === 'Alquiler vacacional' ? ' / noche'
                      : p.operation === 'Alquiler'            ? ' / mes'
                      : '';
    const price       = p.price ? `$${Number(p.price).toLocaleString('es-PA')}${period}` : '';
    const image       = p.images?.[0] || FALLBACK_IMG;
    const propUrl     = `${SITE_URL}/propiedad/${encodeURIComponent(p.code)}`;

    const specs = [
      p.rooms   ? `${p.rooms} hab.`   : null,
      p.baths   ? `${p.baths} baños`  : null,
      p.size    ? `${p.size} m²`      : null,
      p.parking ? `${p.parking} parq.`: null,
    ].filter(Boolean).join(' · ');

    const ogTitle = `${p.title} — ${price}`;
    const ogDesc  = [
      `${p.operation} en ${p.zone}`,
      specs,
      p.description ? p.description.substring(0, 120) + '…' : null,
    ].filter(Boolean).join(' · ');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(ogTitle)}</title>
<meta name="description" content="${esc(ogDesc)}">

<!-- Open Graph — WhatsApp, Facebook, LinkedIn -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="Estela's Realty Services">
<meta property="og:url"         content="${esc(propUrl)}">
<meta property="og:title"       content="${esc(ogTitle)}">
<meta property="og:description" content="${esc(ogDesc)}">
<meta property="og:image"       content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height"content="630">
<meta property="og:locale"      content="es_PA">

<!-- Twitter Card -->
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="${esc(ogTitle)}">
<meta name="twitter:description" content="${esc(ogDesc)}">
<meta name="twitter:image"       content="${esc(image)}">

<link rel="canonical" href="${esc(propUrl)}">

<!-- Redirige al usuario normal inmediatamente -->
<script>window.location.replace("${propUrl}");</script>
</head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f4f2;">
  <p style="color:#888;font-size:14px">Redirigiendo a la propiedad…</p>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Bots ven el HTML fresco; CDN cachea 60s
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });

  } catch (err) {
    return redirect(`${SITE_URL}/propiedad.html?code=${encodeURIComponent(code)}`);
  }
}

function redirect(url) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
