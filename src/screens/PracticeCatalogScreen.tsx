import { HomeActionCard } from '../components/HomeActionCard'
import { practiceExercises } from '../practice/exercises'

export function PracticeCatalogScreen() {
  return <section className="practice-catalog" aria-labelledby="practice-title">
    <header className="practice-catalog__hero">
      <p className="eyebrow">Practice</p>
      <h1 id="practice-title">Learn a technique, one move at a time.</h1>
      <p>Work through curated examples for the techniques SudoCoach can explain reliably.</p>
    </header>
    <section className="practice-catalog__choices" aria-labelledby="practice-choices-title">
      <div>
        <p className="eyebrow">Choose a technique</p>
        <h2 id="practice-choices-title">Start a focused exercise</h2>
      </div>
      <div className="practice-catalog__grid">
        {practiceExercises.map((exercise) => <HomeActionCard
          key={exercise.id}
          kind="practice"
          title={exercise.title}
          description={exercise.description}
          to={`/practice/${exercise.technique}/${exercise.id}`}
        />)}
      </div>
    </section>
  </section>
}
