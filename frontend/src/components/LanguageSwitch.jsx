import React, { useState } from "react";
import { getLanguage, setLanguage } from "../lib/i18n";
export default function LanguageSwitch() {
  const [value, setValue] = useState(getLanguage());
  return (
    <select
      className="language-switch"
      aria-label="Language / Ngôn ngữ"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        setLanguage(e.target.value);
      }}
    >
      <option value="vi">VI</option>
      <option value="en">EN</option>
    </select>
  );
}
