import { createContext, useContext, useMemo, useState } from "react";

const ActiveConversationContext = createContext(null);

export function ActiveConversationProvider({ children }) {
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const value = useMemo(
    () => ({
      activeConversationId,
      setActiveConversationId,
      isUserTyping,
      setIsUserTyping,
    }),
    [activeConversationId, isUserTyping]
  );

  return (
    <ActiveConversationContext.Provider value={value}>
      {children}
    </ActiveConversationContext.Provider>
  );
}

export function useActiveConversation() {
  return useContext(ActiveConversationContext);
}
