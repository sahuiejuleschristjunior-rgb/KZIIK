import React from "react";
import { useOutletContext } from "react-router-dom";
import JobFeed from "../components/JobFeed";

export default function EmploisPage() {
  const outletContext = useOutletContext() || {};
  return (
    <JobFeed {...outletContext} />
  );
}
