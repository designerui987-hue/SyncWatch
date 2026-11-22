"use client";

import React, { useState } from "react";
import { Award, ShieldAlert, FileText, CheckCircle } from "lucide-react";
import { ContentLicenseType, LicenseDeclaration } from "@/lib/licensing/types";
import { Button } from "@/components/ui/button";

interface LicensedContentBadgeProps {
  license?: LicenseDeclaration | null;
}

export const LicensedContentBadge: React.FC<LicensedContentBadgeProps> = ({ license }) => {
  const [showModal, setShowModal] = useState(false);

  if (!license) return null;

  const getBadgeStyle = (type: ContentLicenseType) => {
    switch (type) {
      case "public_domain":
        return { label: "Public Domain", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
      case "creative_commons":
        return { label: "Creative Commons", color: "bg-blue-500/20 text-blue-300 border-blue-500/40" };
      case "creator_owned":
        return { label: "Creator Authorized", color: "bg-purple-500/20 text-purple-300 border-purple-500/40" };
      case "licensed_partner":
        return { label: "Partner Licensed", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
      default:
        return { label: "Standard Web Media", color: "bg-neutral-800 text-neutral-300 border-neutral-700" };
    }
  };

  const style = getBadgeStyle(license.licenseType);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all hover:opacity-90 ${style.color}`}
      >
        <Award className="w-3 h-3 shrink-0" />
        <span>{style.label}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-base">License & Distribution Verification</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-300">
              <div>
                <span className="text-neutral-400 font-medium">License Classification: </span>
                <span className="font-semibold text-white capitalize">{license.licenseType.replace("_", " ")}</span>
              </div>
              <div>
                <span className="text-neutral-400 font-medium">Author / Copyright Holder: </span>
                <span className="font-semibold text-white">{license.authorName}</span>
              </div>
              {license.licenseUrl && (
                <div>
                  <span className="text-neutral-400 font-medium">License Terms: </span>
                  <a
                    href={license.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 underline hover:text-indigo-300 break-all"
                  >
                    {license.licenseUrl}
                  </a>
                </div>
              )}
              {license.authorizationProofNote && (
                <div className="bg-neutral-950 p-2.5 rounded border border-neutral-800 text-[11px]">
                  <strong className="text-neutral-400">Authorization Record: </strong>
                  {license.authorizationProofNote}
                </div>
              )}
            </div>

            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3 text-[11px] text-neutral-400 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-neutral-300">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>DMCA & Copyright Compliance</span>
              </div>
              <p>
                SyncWatch respects intellectual property laws. If you believe this media infringes upon your copyright, please submit a notice to our designated copyright agent.
              </p>
            </div>

            <Button
              onClick={() => setShowModal(false)}
              className="w-full bg-neutral-800 hover:bg-neutral-700 text-white text-xs h-9"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
