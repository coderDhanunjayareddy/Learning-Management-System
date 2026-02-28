import React from "react";
import ErrorState from "./ErrorState";

export default function NotFound() {
  return (
    <ErrorState
      statusCode="404"
      title="Page not found"
      message="The page you are looking for does not exist or has been moved. Use the options below to recover."
      primaryAction={{ label: "Go to Login", to: "/login" }}
      secondaryAction={{ label: "Go to Home", to: "/" }}
    />
  );
}
