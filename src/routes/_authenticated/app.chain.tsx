import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/app/chain")({ component: () => <Navigate to="/app/admin" replace /> });
