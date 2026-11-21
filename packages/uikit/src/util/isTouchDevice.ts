const isTouchDevice = (): boolean => {
  return (
    typeof window !== "undefined" &&
    ("ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      ("msMaxTouchPoints" in navigator && typeof navigator.msMaxTouchPoints === "number" && navigator.msMaxTouchPoints > 0))
  );
};

export default isTouchDevice;