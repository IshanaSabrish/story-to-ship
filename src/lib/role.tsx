import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ROLES, type RoleKey } from "./agents";

const Ctx = createContext<{ role: RoleKey; setRole: (r: RoleKey) => void }>({ role: "po", setRole: () => {} });

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<RoleKey>("po");
  useEffect(() => {
    const saved = localStorage.getItem("af-role") as RoleKey | null;
    if (saved && ROLES.some((r) => r.key === saved)) setRoleState(saved);
  }, []);
  const setRole = (r: RoleKey) => {
    setRoleState(r);
    localStorage.setItem("af-role", r);
  };
  return <Ctx.Provider value={{ role, setRole }}>{children}</Ctx.Provider>;
}

export const useRole = () => useContext(Ctx);
