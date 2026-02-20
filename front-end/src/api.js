/**
 * Jikan API v4 (MyAnimeList)
 * https://api.jikan.moe/v4/
 */

const JIKAN_BASE = 'https://api.jikan.moe/v4'

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function getYear(anime) {
  if (anime.year != null) return anime.year
  const from = anime.aired?.prop?.from
  if (from?.year != null) return from.year
  if (typeof anime.aired?.from === 'string') {
    const y = anime.aired.from.slice(0, 4)
    if (/^\d{4}$/.test(y)) return parseInt(y, 10)
  }
  return null
}

async function fetchTopAnime(page = 1, filter = 'bypopularity', retries = 2) {
  const url = `${JIKAN_BASE}/top/anime?page=${page}&limit=25&filter=${filter}`
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url)
    if (res.status === 429) {
      if (attempt < retries) await delay(3500)
      else throw new Error('Límite de la API alcanzado. Espera ~1 minuto y pulsa Reintentar.')
    }
    if (!res.ok) throw new Error('Error al cargar animes')
    const json = await res.json()
    return json.data || []
  }
  return []
}

/**
 * Top animes más vistos (últimos dos años). Solo 1 petición para evitar 429.
 */
export async function getTopAnimesLastTwoYears() {
  const currentYear = new Date().getFullYear()
  const minYear = currentYear - 2
  const list = await fetchTopAnime(1, 'bypopularity')
  const filtered = list
    .filter((a) => {
      const year = getYear(a)
      return year != null && year >= minYear && year <= currentYear
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 24)
  if (filtered.length >= 6) return filtered
  return list.slice(0, 24)
}
