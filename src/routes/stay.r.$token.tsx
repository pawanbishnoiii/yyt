import { createFileRoute } from "@tanstack/react-router";
import { GuestApp } from "@/components/GuestApp";

export const Route = createFileRoute("/stay/r/$token")({
  head: () => ({
    meta: [
      { title: "Your room — StayOS Guest" },
      { name: "description", content: "Order food, request housekeeping and track your bill from your room." },
      { property: "og:title", content: "Your room — StayOS Guest" },
      { property: "og:description", content: "In-room services for hotel guests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <GuestApp token={Route.useParams().token} />,
});
