import React from 'react';
import JobCard from '../components/JobCard';
import { mockJobs } from '../data/jobs'; // Importe les données
import './JobList.css'; // Créez ce fichier CSS pour la mise en page

function JobList() {
  return (
    <div className="job-list-container">
      <h1>Trouvez votre prochain emploi</h1>
      
      <div className="job-list-grid">
        {/* L'étape clé : Utiliser la méthode .map() pour boucler sur les données */}
        {mockJobs.map(job => (
          <JobCard 
            key={job.id} // Clé unique requise par React pour les listes
            job={job}   // Passe l'objet emploi complet au JobCard
          />
        ))}
        {/* Si le tableau est vide, afficher un message */}
        {mockJobs.length === 0 && <p>Aucun emploi disponible pour le moment.</p>}
      </div>
    </div>
  );
}

export default JobList;