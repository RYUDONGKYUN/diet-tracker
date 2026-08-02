import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", label: "오늘", end: true },
  { to: "/weight", label: "체중" },
  { to: "/calendar", label: "식사" },
  { to: "/photos", label: "눈바디" },
  { to: "/exercise", label: "운동" },
  { to: "/settings", label: "설정" },
];

export default function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => (isActive ? "active" : "")}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
