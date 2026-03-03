import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { COMPANIES } from "../constants";

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ user, profile, onSignOut, children }) {
  const [activeCompany, setActiveCompany] = useState(null);
  const [columns, setColumns]             = useState([]);
  const [cards, setCards]                 = useState([]);
  const [notifRules, setNotifRules]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allUsers, setAllUsers]           = useState([]);
  const [locationTags, setLocationTags]   = useState([]);

  const isAdmin = profile?.role === "admin";
  const can = (key) => isAdmin || !!(profile?.permissions?.[key]);
  const accessibleCompanies = isAdmin ? COMPANIES : (profile?.companies || []);

  useEffect(() => {
    if (accessibleCompanies.length > 0 && !activeCompany)
      setActiveCompany(accessibleCompanies[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const loadData = useCallback(async () => {
    if (!activeCompany) return;
    const [colRes, cardRes, ruleRes, userRes, locRes] = await Promise.all([
      supabase.from("pipeline_columns").select("*").eq("company", activeCompany).order("position", {ascending:true}),
      supabase.from("pipeline_cards").select("*").eq("company", activeCompany).order("position", {ascending:true}),
      supabase.from("notification_rules").select("*").eq("company", activeCompany),
      supabase.from("profiles").select("id, name, role, companies, permissions"),
      supabase.from("location_tags").select("*").eq("company", activeCompany).order("name"),
    ]);
    if (colRes.data)  setColumns(colRes.data);
    if (cardRes.data) setCards(cardRes.data);
    if (ruleRes.data) setNotifRules(ruleRes.data);
    if (userRes.data) setAllUsers(userRes.data);
    if (locRes.data)  setLocationTags(locRes.data);
  }, [activeCompany]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <AppContext.Provider value={{
      user, profile, isAdmin, can, onSignOut,
      activeCompany, setActiveCompany, accessibleCompanies,
      columns, setColumns, cards, setCards,
      notifRules, setNotifRules, notifications, setNotifications,
      allUsers, locationTags, setLocationTags, loadData,
    }}>
      {children}
    </AppContext.Provider>
  );
}