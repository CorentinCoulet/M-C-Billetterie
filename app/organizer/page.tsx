import { redirect } from 'next/navigation';

export default function OrganizerRootRedirect() {
  // Redirige l'ancien espace /organizer vers le nouveau tableau de bord
  redirect('/dashboard');
}
