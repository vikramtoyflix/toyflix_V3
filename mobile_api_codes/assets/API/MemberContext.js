// MemberContext.js
import React, { createContext, useState, useContext } from 'react';

// Create a Context for the member ID
const MemberContext = createContext();

// Create a Provider component
export const MemberProvider = ({ children }) => {
    const [memberId, setMemberId] = useState(null);

    return (
        <MemberContext.Provider value={{ memberId, setMemberId }}>
            {children}
        </MemberContext.Provider>
    );
};

// Create a custom hook to use the MemberContext
export const useMember = () => {
    return useContext(MemberContext);
};
