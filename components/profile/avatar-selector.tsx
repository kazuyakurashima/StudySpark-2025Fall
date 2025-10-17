"use client"

import Image from "next/image"
import { Avatar, UserRole, getAvatarsByRole } from "@/lib/constants/avatars"

interface AvatarSelectorProps {
  role: UserRole
  selectedAvatar: string | null
  onSelect: (avatarId: string) => void
}

export function AvatarSelector({ role, selectedAvatar, onSelect }: AvatarSelectorProps) {
  const avatars = getAvatarsByRole(role)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">アバター</label>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {avatars.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            data-avatar-id={avatar.id}
            className={`
              relative aspect-square rounded-lg border-2 transition-all duration-200
              hover:scale-105 hover:shadow-md
              ${
                selectedAvatar === avatar.id
                  ? "border-blue-500 bg-blue-50 shadow-lg"
                  : "border-gray-200 bg-white hover:border-blue-300"
              }
            `}
          >
            <Image src={avatar.src} alt={avatar.name} fill className="object-cover rounded-lg p-2" />
            <span className="sr-only">{avatar.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
