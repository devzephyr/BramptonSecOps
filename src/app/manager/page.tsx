"use client";

import { RolePage } from "@/components/desk/role-page";

export default function ManagerPage() {
  return <RolePage roles={["manager", "admin", "logistics"]} />;
}
