import { HomeActionCard } from '../components/HomeActionCard'
import { practiceExercises, practiceGroups } from '../practice/exercises'

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
        <h2 id="practice-choices-title">Learn the next useful pattern</h2>
      </div>
      {practiceGroups.map((group) => <section className="practice-catalog__group" key={group.id} aria-labelledby={`practice-group-${group.id}`}>
        <div className="practice-catalog__group-heading"><h3 id={`practice-group-${group.id}`}>{group.title}</h3><p>{group.description}</p></div>
        <div className="practice-catalog__grid">
          {practiceExercises.filter((exercise) => exercise.group === group.id).map((exercise) => <HomeActionCard
            key={exercise.id}
            kind="practice"
            title={exercise.title}
            description={exercise.description}
            to={`/practice/${exercise.technique}/${exercise.id}`}
          />)}
        </div>
      </section>)}
    </section>
  </section>
}
