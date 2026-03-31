import {
  UserGroupIcon,
  UserIcon,
  UsersIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  BuildingLibraryIcon,
  TruckIcon,
  SparklesIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";

const plans = [
  {
    name: "Basic",
    price: { monthly: 999, yearly: 9990 },
    limits: [
      { icon: <UsersIcon className="w-4 h-4" />, label: "Students", value: "200" },
      { icon: <UserGroupIcon className="w-4 h-4" />, label: "Staff", value: "10" },
      { icon: <UserIcon className="w-4 h-4" />, label: "Admins", value: "1" },
    ],
    modules: [
      { icon: <AcademicCapIcon className="w-4 h-4" />, label: "Student Management" },
      { icon: <CheckCircleIcon className="w-4 h-4" />, label: "Attendance" },
      { icon: <Cog6ToothIcon className="w-4 h-4" />, label: "Reports" },
    ],
    features: ["Email Support"],
    cta: "Start Free Trial",
    highlight: false,
    badge: null,
  },
  {
    name: "Standard",
    price: { monthly: 1999, yearly: 19990 },
    limits: [
      { icon: <UsersIcon className="w-4 h-4" />, label: "Students", value: "1000" },
      { icon: <UserGroupIcon className="w-4 h-4" />, label: "Staff", value: "50" },
      { icon: <UserIcon className="w-4 h-4" />, label: "Admins", value: "3" },
    ],
    modules: [
      { icon: <AcademicCapIcon className="w-4 h-4" />, label: "Student Management" },
      { icon: <CheckCircleIcon className="w-4 h-4" />, label: "Attendance" },
      { icon: <Cog6ToothIcon className="w-4 h-4" />, label: "Reports" },
      { icon: <BuildingLibraryIcon className="w-4 h-4" />, label: "Fee Management" },
      { icon: <SparklesIcon className="w-4 h-4" />, label: "Exams" },
      { icon: <DevicePhoneMobileIcon className="w-4 h-4" />, label: "Parent Portal" },
      { icon: <TruckIcon className="w-4 h-4" />, label: "Notifications" },
    ],
    features: ["Priority Support"],
    cta: "Get Started",
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Premium",
    price: { monthly: 3999, yearly: 39990 },
    limits: [
      { icon: <UsersIcon className="w-4 h-4" />, label: "Students", value: "∞" },
      { icon: <UserGroupIcon className="w-4 h-4" />, label: "Staff", value: "∞" },
      { icon: <UserIcon className="w-4 h-4" />, label: "Admins", value: "∞" },
    ],
    modules: [
      { icon: <SparklesIcon className="w-4 h-4" />, label: "AI Reports" },
      { icon: <TruckIcon className="w-4 h-4" />, label: "Transport" },
      { icon: <BuildingLibraryIcon className="w-4 h-4" />, label: "Hostel" },
      { icon: <BuildingLibraryIcon className="w-4 h-4" />, label: "Library" },
      { icon: <Cog6ToothIcon className="w-4 h-4" />, label: "Multi-branch" },
    ],
    features: ["Dedicated Manager", "Custom Integrations"],
    cta: "Contact Sales",
    highlight: false,
    badge: null,
  },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export function PricingInteraction({ onPlanSelect }: { onPlanSelect?: (plan: string) => void }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selected, setSelected] = useState("Standard");

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-10">
      {/* HEADER */}
      <div className="text-center mb-10">
        <h2 className="text-4xl font-bold text-white mb-2">
          Subscription Plans
        </h2>
        <p className="text-slate-400">
          Choose the best plan for your school
        </p>

        {/* TOGGLE */}
        <div className="flex justify-center mt-6">
          <div className="bg-slate-800 rounded-full p-1 flex border border-slate-700">
            {["monthly", "yearly"].map((type) => (
              <button
                key={type}
                onClick={() => setBilling(type as 'monthly' | 'yearly')}
                className={classNames(
                  "px-5 py-2 rounded-full text-sm font-semibold",
                  billing === type
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.name}
            onClick={() => {
              setSelected(plan.name);
              onPlanSelect?.(plan.name);
            }}
            className={classNames(
              "rounded-2xl p-6 border cursor-pointer transition-all",
              "bg-slate-900 border-slate-700 hover:-translate-y-2",
              selected === plan.name && "border-indigo-500",
              plan.highlight &&
                "border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-purple-500/10"
            )}
          >
            {/* BADGE */}
            {plan.badge && (
              <div className="mb-3 text-xs bg-indigo-600 text-white px-3 py-1 rounded-full inline-block">
                {plan.badge}
              </div>
            )}

            {/* TITLE */}
            <h3 className="text-xl font-semibold text-white mb-2">
              {plan.name}
            </h3>

            {/* PRICE */}
            <div className="mb-5">
              <span className="text-4xl font-bold text-white">
                ₹
                {billing === "monthly"
                  ? plan.price.monthly
                  : Math.floor(plan.price.yearly / 12)}
              </span>
              <span className="text-slate-400 ml-1">/mo</span>
            </div>

            {/* LIMITS */}
            <div className="space-y-2 mb-4">
              {plan.limits.map((limit, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center bg-slate-800 px-3 py-2 rounded-lg text-sm"
                >
                  <span className="flex items-center gap-2 text-slate-300">
                    {limit.icon}
                    {limit.label}
                  </span>
                  <span className="text-white font-semibold">
                    {limit.value}
                  </span>
                </div>
              ))}
            </div>

            {/* MODULES */}
            <div className="mb-4">
              <p className="text-indigo-400 text-sm mb-2">Modules</p>
              <ul className="space-y-1 text-sm text-slate-300">
                {plan.modules.map((m, i) => (
                  <li key={i} className="flex items-center gap-2">
                    {m.icon}
                    {m.label}
                  </li>
                ))}
              </ul>
            </div>

            {/* FEATURES */}
            <div className="mb-6">
              <ul className="space-y-1 text-sm text-slate-400">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-indigo-400" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* BUTTON */}
            <button
              className={classNames(
                "w-full py-3 rounded-xl font-semibold transition",
                plan.highlight
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-slate-800 text-white hover:bg-indigo-600"
              )}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PricingInteraction;