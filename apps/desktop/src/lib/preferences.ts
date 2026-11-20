export type Preferences = {
  theme: "dark" | "light";
  unit: "celsius" | "fahrenheit";
};
export function loadPreferences(): Preferences {
  try {
    const value = JSON.parse(
      localStorage.getItem("nepteer.preferences") ?? "{}",
    );
    return {
      theme: value?.theme === "light" ? "light" : "dark",
      unit: value?.unit === "fahrenheit" ? "fahrenheit" : "celsius",
    };
  } catch {
    return { theme: "dark", unit: "celsius" };
  }
}
