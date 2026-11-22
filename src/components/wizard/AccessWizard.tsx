"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Users,
  Tv,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Laptop,
  Smartphone,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProviderId } from "@/lib/providers/types";
import { PROVIDER_REGISTRY } from "@/lib/providers/registry";
import {
  evaluateWatchPartyAccess,
  HouseholdStatus,
  DeviceType,
  AccessWizardInput,
  EvaluationResult,
} from "@/lib/wizard/access-evaluator";

interface AccessWizardProps {
  initialProvider?: ProviderId;
  onSelectOption?: (provider: ProviderId, details: any) => void;
  onClose?: () => void;
}

export const AccessWizard: React.FC<AccessWizardProps> = ({
  initialProvider = "youtube",
  onSelectOption,
  onClose,
}) => {
  const [provider, setProvider] = useState<ProviderId>(initialProvider);
  const [contentTitle, setContentTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(2);
  const [householdStatus, setHouseholdStatus] = useState<HouseholdStatus>("different_households");
  const [devices, setDevices] = useState<DeviceType[]>(["desktop_chrome", "desktop_chrome"]);
  const [hostHasSub, setHostHasSub] = useState(true);
  const [viewersWithSub, setViewersWithSub] = useState(0);
  const [planTier, setPlanTier] = useState<"standard_2screens" | "premium_4screens">("standard_2screens");
  const [showResults, setShowResults] = useState(false);

  const handleDeviceToggle = (device: DeviceType) => {
    if (devices.includes(device)) {
      if (devices.length > 1) {
        setDevices(devices.filter((d) => d !== device));
      }
    } else {
      setDevices([...devices, device]);
    }
  };

  const currentInput: AccessWizardInput = {
    provider,
    contentTitle,
    viewerCount,
    devices,
    householdStatus,
    entitlements: {
      hostHasSubscription: hostHasSub,
      viewersWithSubscriptionCount: viewersWithSub,
      planTier,
    },
  };

  const evaluation: EvaluationResult = evaluateWatchPartyAccess(currentInput);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-2xl w-full text-white shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Watch Party Access Wizard</h2>
            <p className="text-sm text-neutral-400">
              Find the legally compliant, minimum-cost viewing setup for your party.
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} className="text-neutral-400 hover:text-white">
            ✕
          </Button>
        )}
      </div>

      {/* Zero Credential Callout */}
      <div className="flex items-start gap-3 bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-3 text-xs text-neutral-300">
        <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-emerald-300">Zero-Credential Guarantee:</strong> SyncWatch never asks for, stores,
          or transmits OTT passwords or cookies. Each participant signs in directly on the provider&apos;s verified domain.
        </p>
      </div>

      {!showResults ? (
        <div className="space-y-5">
          {/* 1. Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">1. Video Source / Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PROVIDER_REGISTRY) as ProviderId[]).map((pid) => {
                const cap = PROVIDER_REGISTRY[pid];
                const isSelected = provider === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setProvider(pid)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/10 text-white"
                        : "border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                    }`}
                  >
                    <span className="font-semibold text-sm">{cap.name}</span>
                    <span
                      className={`text-[10px] mt-1 px-1.5 py-0.5 rounded font-mono uppercase ${
                        cap.integrationStatus === "implemented"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : cap.integrationStatus === "experimental"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {cap.integrationStatus}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Viewers & Household */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                2. Number of Viewers
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={viewerCount}
                  onChange={(e) => setViewerCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-neutral-950 border-neutral-800 text-white"
                />
                <span className="text-xs text-neutral-400 whitespace-nowrap">people</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Household Location
              </label>
              <select
                value={householdStatus}
                onChange={(e) => setHouseholdStatus(e.target.value as HouseholdStatus)}
                className="w-full h-10 px-3 rounded-md bg-neutral-950 border border-neutral-800 text-sm text-neutral-200"
              >
                <option value="same_household">Same Physical Household</option>
                <option value="different_households">Different Households (Friends apart)</option>
                <option value="mixed">Mixed (Some at home, some remote)</option>
              </select>
            </div>
          </div>

          {/* 3. Devices in Use */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              3. Viewer Devices
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "desktop_chrome" as DeviceType, label: "Chrome / Edge (PC/Mac)", icon: Laptop },
                { id: "desktop_safari" as DeviceType, label: "Mac Safari", icon: Laptop },
                { id: "android_mobile" as DeviceType, label: "Android Phone", icon: Smartphone },
                { id: "ios_mobile" as DeviceType, label: "iPhone (iOS)", icon: Smartphone },
                { id: "ipad_tablet" as DeviceType, label: "iPad / Tablet", icon: Smartphone },
              ].map((item) => {
                const active = devices.includes(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDeviceToggle(item.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-all ${
                      active
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300"
                        : "border-neutral-800 bg-neutral-950/40 text-neutral-400"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Provider-Specific Entitlements */}
          {provider === "netflix" && (
            <div className="bg-neutral-950/50 border border-neutral-800/80 rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Netflix Plan Entitlements
              </span>
              <div className="flex items-center gap-4 text-sm text-neutral-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hostHasSub}
                    onChange={(e) => setHostHasSub(e.target.checked)}
                    className="rounded bg-neutral-900 border-neutral-700 text-indigo-600"
                  />
                  <span>Host has active account</span>
                </label>
                {hostHasSub && (
                  <select
                    value={planTier}
                    onChange={(e) => setPlanTier(e.target.value as any)}
                    className="px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-xs text-neutral-200"
                  >
                    <option value="standard_2screens">Standard (2 screens)</option>
                    <option value="premium_4screens">Premium (4 screens)</option>
                  </select>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-400">
                <span>Other friends with their own account:</span>
                <Input
                  type="number"
                  min={0}
                  max={viewerCount - 1}
                  value={viewersWithSub}
                  onChange={(e) => setViewersWithSub(parseInt(e.target.value) || 0)}
                  className="w-16 h-8 bg-neutral-900 border-neutral-700 text-white"
                />
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowResults(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
          >
            Calculate Legal Access Options
          </Button>
        </div>
      ) : (
        /* ── Results View ── */
        <div className="space-y-5">
          {/* Platform Limitations Alert if any */}
          {evaluation.platformLimitations.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Device Sandbox Notice</span>
              </div>
              {evaluation.platformLimitations.map((lim, i) => (
                <p key={i} className="leading-relaxed opacity-90">
                  {lim}
                </p>
              ))}
            </div>
          )}

          {/* Options List */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Evaluated Options (Ranked by Legality & Minimum Cost)
            </span>

            {evaluation.options.map((opt) => (
              <div
                key={opt.id}
                className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 space-y-3 hover:border-neutral-700 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{opt.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          opt.feasibility === "recommended"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : opt.feasibility === "feasible"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : opt.feasibility === "additional_cost"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-red-500/20 text-red-300 border border-red-500/30"
                        }`}
                      >
                        {opt.feasibility === "recommended"
                          ? "Recommended"
                          : opt.feasibility === "feasible"
                          ? "Feasible"
                          : opt.feasibility === "additional_cost"
                          ? "Extra Cost"
                          : "Unsupported"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">{opt.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-400">{opt.estimatedAdditionalCost}</span>
                  </div>
                </div>

                <div className="border-t border-neutral-800/80 pt-2 text-[11px] text-neutral-400 space-y-1">
                  <div>
                    <strong className="text-neutral-300">Legal basis:</strong> {opt.legalBasis}
                  </div>
                  <div>
                    <strong className="text-neutral-300">Action:</strong> {opt.recommendedAction}
                  </div>
                </div>

                {onSelectOption && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onSelectOption(provider, opt)}
                    className="w-full text-xs h-8 border-neutral-700 hover:bg-neutral-800"
                  >
                    Select this setup
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResults(false)}
              className="flex-1 border-neutral-800 text-neutral-300 hover:text-white"
            >
              Modify Parameters
            </Button>
            {onClose && (
              <Button onClick={onClose} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white">
                Done
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
