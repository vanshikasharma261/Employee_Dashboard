import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { AppDispatch, RootState } from "./store";

/** Typed `useDispatch` — use instead of the plain hook everywhere. */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/** Typed `useSelector` — use instead of the plain hook everywhere. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
