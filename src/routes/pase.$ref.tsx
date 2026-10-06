import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pase/$ref")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/pass/$ref", params: { ref: params.ref }, statusCode: 301 });
  },
});
