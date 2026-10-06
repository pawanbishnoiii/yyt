import { createFileRoute } from "@tanstack/react-router";
import { GuestApp } from "@/components/GuestApp";

export const Route = createFileRoute("/stay/h/$id")({
  head: () => ({
    meta: [
      { title: "Hotel details — StayOS Guest" },
      { name: "description", content: "Rooms, prices, menu and offers for this hotel." },
      { property: "og:title", content: "Hotel details — StayOS Guest" },
      { property: "og:description", content: "Rooms, prices, menu and offers for this hotel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <GuestApp hotelId={Route.useParams().id} />,
});
