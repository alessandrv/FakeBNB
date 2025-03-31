import React from 'react';

const MaybeShowNavBar = ({ children }: { children: React.ReactNode }) => {
    return (
        <div>
            {children}
        </div>
    )
}

export default MaybeShowNavBar;