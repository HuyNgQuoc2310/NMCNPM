import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { apiFetch } from "../services/apiClient";
import { getDefaultReportRange } from "../utils/reportDateRange";

export function useReportModule(endpoint, responseKey) {
  const { logout, token } = useAuth();
  const initialRange = useMemo(() => getDefaultReportRange(), []);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [range, setRange] = useState(initialRange);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleAuthError = useCallback((error) => {
    if (error.status === 401) {
      logout();
      return true;
    }

    return false;
  }, [logout]);

  const fetchReport = useCallback(async (nextRange) => {
    try {
      setLoading(true);
      setFeedback({ type: "", message: "" });
      const query = new URLSearchParams(nextRange).toString();
      const response = await apiFetch(`${endpoint}?${query}`, { token });
      setData(response[responseKey] || []);
    } catch (error) {
      if (!handleAuthError(error)) {
        setFeedback({ type: "error", message: error.message });
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint, handleAuthError, responseKey, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchReport(initialRange);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchReport, initialRange]);

  function handleRangeChange(event) {
    setRange((currentValue) => ({
      ...currentValue,
      [event.target.name]: event.target.value
    }));
  }

  function resetRange() {
    const nextRange = getDefaultReportRange();
    setRange(nextRange);
    void fetchReport(nextRange);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await fetchReport(range);
  }

  return {
    data,
    feedback,
    handleRangeChange,
    handleSubmit,
    loading,
    range,
    resetRange
  };
}
