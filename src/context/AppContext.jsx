import { createContext, useContext } from "react";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ value, children }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}