"use client";

import { useState } from "react";
import CreateTeamModal from "./CreateTeamModal";

interface Props {
  canCreateTeam: boolean;
}

export default function NoTeamState({ canCreateTeam }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-semibold mb-2">No teams yet</h2>
        {canCreateTeam ? (
          <>
            <p className="text-gray-500 text-sm mb-6">Create your first team to get started.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium"
            >
              Create a team
            </button>
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            You&apos;ll be added to a team via an invitation link from your coach.
          </p>
        )}
      </div>
      {showCreate && <CreateTeamModal onClose={() => setShowCreate(false)} />}
    </>
  );
}
