import React, { useContext } from 'react';

// eslint-disable-next-line import/prefer-default-export
export const LoadingContext = React.createContext({});
export const LoadingProvider = LoadingContext.Provider;

export const useLoading = () => useContext(LoadingContext);
