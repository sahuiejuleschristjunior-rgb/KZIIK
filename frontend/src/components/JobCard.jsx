import React from 'react';
import './JobCard.css'; // Créez ce fichier CSS pour le style

function JobCard({ job }) {
  // Le composant reçoit un objet 'job' en tant que prop
  return (
    <div className="job-card" onClick={() => console.log('Voir détails de:', job.id)}>
      <h3>{job.title}</h3>
      <p><strong>Entreprise :</strong> {job.company}</p>
      <p><strong>Lieu :</strong> {job.location}</p>
      <span className={`job-type job-type-${job.type.toLowerCase()}`}>{job.type}</span>
      {/* C'est sur ce bloc que vous aurez le premier aperçu visuel ! */}
    </div>
  );
}

export default JobCard;