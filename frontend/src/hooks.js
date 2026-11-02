import { useEffect, useState } from "react";
import { api } from "./api.js";
export function useResource(path) {
  const [state, setState] = useState({
    data: null,
    loading: !!path,
    error: "",
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: "" });
      return;
    }
    const controller = new AbortController();
    let ignore = false;
    setState((old) => ({ ...old, loading: true, error: "" }));
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!ignore) setState({ data, loading: false, error: "" });
      })
      .catch((error) => {
        if (!ignore && error.name !== "AbortError")
          setState({ data: null, loading: false, error: error.message });
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [path, revision]);
  return { ...state, refresh: () => setRevision((value) => value + 1) };
}
export function useRoute() {
  const [path, setPath] = useState(
    window.location.hash.slice(1) || "/dashboard",
  );
  useEffect(() => {
    const update = () => setPath(window.location.hash.slice(1) || "/dashboard");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  const url = new URL(path, "http://taskflow");
  return { path, pathname: url.pathname, params: url.searchParams };
}
