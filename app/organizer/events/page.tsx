import { redirect } from 'next/navigation';

export default function OrganizerEventsRedirect() {
  redirect('/dashboard/events');
}
