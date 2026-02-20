import { useState, useEffect } from 'react'
import { getTopAnimesLastTwoYears } from './api'
import AnimeCard from './AnimeCard'
import './App.css'

const currentYear = new Date().getFullYear()
const TWO_YEARS_AGO = currentYear - 2

function App() {
  const [animes, setAnimes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = () => {
    setError(null)
    setLoading(true)
    getTopAnimesLastTwoYears()
      .then((data) => setAnimes(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <h1>Top animes más vistos</h1>
          <p className="subtitle">Últimos dos años ({TWO_YEARS_AGO} – {currentYear})</p>
        </header>
        <div className="loading">
          <div className="spinner" />
          <p>Cargando ranking…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app">
        <header className="header">
          <h1>Top animes más vistos</h1>
        </header>
        <div className="error">
          <p>No se pudo cargar el ranking.</p>
          <p className="error-detail">{error}</p>
          <button type="button" className="retry-btn" onClick={load}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Top animes más vistos</h1>
        <p className="subtitle">Últimos dos años ({TWO_YEARS_AGO} – {currentYear}) · con imágenes</p>
      </header>
      <main className="grid">
        {animes.map((anime, index) => (
          <AnimeCard key={anime.mal_id} anime={anime} rank={index + 1} />
        ))}
      </main>
    </div>
  )
}

export default App
