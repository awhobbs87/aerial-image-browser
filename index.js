export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Serve HTML UI at root
    if (url.pathname === "/") {
      return new Response(htmlPage, {
        headers: { "content-type": "text/html; charset=UTF-8" },
      });
    }

    // API endpoint: /photos?film_no=0442
    if (url.pathname === "/photos") {
      const film = url.searchParams.get("film_no") || "";
      const year = url.searchParams.get("year") || "";
      const where = film
        ? `FILM_NO='${film}'`
        : year
        ? `FLY_DATE >= date '${year}-01-01' AND FLY_DATE < date '${+year + 1}-01-01'`
        : "1=1";

      const arcgis = new URL(
        "https://services.thelist.tas.gov.au/arcgis/rest/services/AerialPhotoViewer/AerialPhoto_TimeV2/MapServer/0/query"
      );
      arcgis.search = new URLSearchParams({
        where,
        outFields:
          "FILM_NO,FRAME,FLY_DATE,SCALE,DOWNLOAD_LINK,THUMBNAIL_LINK,PROJ_NAME",
        f: "json",
        resultRecordCount: 50,
      });

      const res = await fetch(arcgis.toString());
      const data = await res.json();

      const features = (data.features || []).map((f) => ({
        film_no: f.attributes.FILM_NO,
        frame: f.attributes.FRAME,
        date: f.attributes.FLY_DATE
          ? new Date(f.attributes.FLY_DATE).toISOString().split("T")[0]
          : null,
        scale: f.attributes.SCALE,
        project: f.attributes.PROJ_NAME,
        thumbnail: f.attributes.THUMBNAIL_LINK,
        download: f.attributes.DOWNLOAD_LINK,
      }));

      return new Response(JSON.stringify(features, null, 2), {
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // 404 fallback
    return new Response("Not found", { status: 404 });
  },
};

// ----------------------------------------------------------
// Embedded HTML UI
// ----------------------------------------------------------

const htmlPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tas Aerial Photos Viewer</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; background: #f9fafb; color: #111; }
    header { background: #4060af; color: white; padding: 1rem; text-align: center; }
    form { display: flex; justify-content: center; gap: 0.5rem; padding: 1rem; flex-wrap: wrap; }
    input, button { font-size: 1rem; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #ccc; }
    button { background: #4060af; color: white; border: none; cursor: pointer; }
    button:hover { background: #32509a; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; padding: 1rem; }
    .card { background: white; border-radius: 0.75rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    .card img { width: 100%; height: 120px; object-fit: cover; background: #eee; }
    .card div { padding: 0.5rem; font-size: 0.9rem; }
    .card a { color: #4060af; text-decoration: none; font-weight: 500; }
    .card a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header><h1>Tasmanian Aerial Photos</h1></header>

  <form id="search">
    <input id="film" placeholder="Film No (e.g. 0442)" />
    <input id="year" placeholder="Year (e.g. 1975)" />
    <button type="submit">Search</button>
  </form>

  <section class="grid" id="results"></section>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search');
  const results = document.getElementById('results');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    results.innerHTML = '<p style="padding:1rem;">Loading…</p>';

    const film = document.getElementById('film').value.trim();
    const year = document.getElementById('year').value.trim();
    const query = new URLSearchParams({ film_no: film, year }).toString();

    const res = await fetch('/photos?' + query);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      results.innerHTML = '<p style="padding:1rem;">No results found.</p>';
      return;
    }

    // ✅ Construct HTML safely without confusing TypeScript/JSX parser
    let html = '';
    for (const photo of data) {
      html += ``
        <div class="card">
          <img src="${photo.thumbnail || ''}" alt="thumb" loading="lazy" />
          <div>
            <strong>Film:</strong> ${photo.film_no}<br/>
            <strong>Frame:</strong> ${photo.frame}<br/>
            <strong>Date:</strong> ${photo.date || '—'}<br/>
            <strong>Scale:</strong> 1:${photo.scale || '—'}<br/>
            <a href="${photo.download}" target="_blank">Full Resolution</a>
          </div>
        </div>
      ``;
    }

    results.innerHTML = html;
  });
});
</script>
</body>
</html>`;