import { useEffect } from "react";
import AppRouter from "./app/router";
import { fetchCurrentUser } from "./features/auth/authThunks";
import { useAppDispatch } from "./store/hooks";

/**
 * Root component. On boot it dispatches `fetchCurrentUser` to rehydrate the
 * session from the httpOnly cookie (the cookie-based equivalent of token
 * persistence): 200 restores the user, 401 leaves the app unauthenticated.
 */
export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return <AppRouter />;
}
