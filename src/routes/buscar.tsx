import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/buscar")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/search", search: search as never, statusCode: 301 });
  },
});
