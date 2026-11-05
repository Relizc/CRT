import { useEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";

MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

// MathLive manages only this empty host; React owns its label and error message.
export function MathInput({ axis, value, onChange }) {
  const host = useRef(null), field = useRef(null), onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const input = new MathfieldElement();
    input.id = `eq-${axis}`;
    input.setAttribute("aria-label", `${axis === "x" ? "Horizontal" : "Vertical"} coil current in amperes as a function of t`);
    input.mathVirtualKeyboardPolicy = "manual";
    input.smartFence = true;
    const handleInput = () => onChangeRef.current(input.value);
    input.addEventListener("input", handleInput);
    host.current.append(input);
    field.current = input;
    return () => {
      input.removeEventListener("input", handleInput);
      input.remove();
      field.current = null;
    };
  }, [axis]);
  useEffect(() => {
    if (field.current && field.current.value !== value) field.current.value = value;
  }, [value]);
  return <div id={`field-${axis}`} ref={host} />;
}
