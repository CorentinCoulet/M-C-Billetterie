import { getEvents } from "@/lib/events";

type Event = {
  id: string;
  title: string;
  date: Date;
  location: string;
};

export default async function HomePage() {
  const events: Event[] = await getEvents();

  return (
    <main className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Événements à venir</h1>
      <ul className="space-y-4">
        {events.map((event) => (
          <li key={event.id} className="border rounded p-4">
            <a href={`/events/${event.id}`} className="text-lg font-semibold hover:underline">
              {event.title}
            </a>
            <div className="text-sm text-gray-600">{event.date.toLocaleDateString()}</div>
            <div>{event.location}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}