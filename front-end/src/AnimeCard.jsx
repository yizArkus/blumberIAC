import './AnimeCard.css'

function AnimeCard({ anime, rank }) {
  const imageUrl = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url || ''
  const title = anime.title ?? anime.title_english ?? 'Sin título'
  const score = anime.score != null ? anime.score.toFixed(1) : '–'
  const year = anime.year ?? anime.aired?.prop?.from?.year ?? ''

  return (
    <article className="anime-card">
      <div className="anime-card__rank">#{rank}</div>
      <div className="anime-card__img-wrap">
        <img
          src={imageUrl}
          alt={title}
          className="anime-card__img"
          loading="lazy"
        />
      </div>
      <div className="anime-card__body">
        <h2 className="anime-card__title">{title}</h2>
        <div className="anime-card__meta">
          {year && <span className="anime-card__year">{year}</span>}
          <span className="anime-card__score">★ {score}</span>
        </div>
        {anime.synopsis && (
          <p className="anime-card__synopsis">{anime.synopsis.slice(0, 120)}…</p>
        )}
      </div>
    </article>
  )
}

export default AnimeCard
