'use client'

import { useState } from 'react'

interface PartnerProfile {
  fullName: string
  preferredName: string
  age: number
  pronouns: string
  occupation: string
  selfDescription: string
  interests: string
  personality?: string
  hiddenTruth?: string
  enthusiasmLevel?: 'low' | 'medium' | 'high'
  communicationStyle?: string
}

interface RelationshipInfo {
  durationMonths: number
  description: string
  goals: string
  howWeMet: string
  livingSituation: string
}

interface Props {
  onSubmit: (partnerA: PartnerProfile, partnerB: PartnerProfile, relationship: RelationshipInfo) => void
  isCreating: boolean
}

const defaultPartnerA: PartnerProfile = {
  fullName: 'Alex Test',
  preferredName: 'Alex',
  age: 28,
  pronouns: 'they/them',
  occupation: 'Software Engineer',
  selfDescription: 'I value clear communication and quality time together. Sometimes I get overwhelmed with work stress.',
  interests: 'Hiking, cooking, reading sci-fi',
  personality: 'Introverted, analytical, tends to withdraw when stressed',
  hiddenTruth: 'Feeling burnt out at work but afraid to admit it might mean needing a career change',
  enthusiasmLevel: 'medium',
  communicationStyle: 'Logical and measured, sometimes overly rational when avoiding emotions'
}

const defaultPartnerB: PartnerProfile = {
  fullName: 'Jordan Test',
  preferredName: 'Jordan',
  age: 30,
  pronouns: 'she/her',
  occupation: 'Graphic Designer',
  selfDescription: 'I\'m creative and emotional. I need verbal affirmation and struggle when I feel unheard.',
  interests: 'Art, yoga, traveling',
  personality: 'Extroverted, expressive, needs verbal reassurance',
  hiddenTruth: 'Worried that Alex is pulling away emotionally and fears they might want to break up',
  enthusiasmLevel: 'high',
  communicationStyle: 'Emotional and direct, sometimes escalates quickly when feeling dismissed'
}

const defaultRelationship: RelationshipInfo = {
  durationMonths: 24,
  description: 'We met at a coffee shop and have been together for 2 years. We love spending time together but sometimes struggle with communication during stressful times.',
  goals: 'Improve our communication patterns, learn to handle conflict better, and reconnect emotionally.',
  howWeMet: 'At a local coffee shop - we both reached for the last blueberry muffin',
  livingSituation: 'Living together in a one-bedroom apartment'
}

export default function ProfileForm({ onSubmit, isCreating }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [partnerA, setPartnerA] = useState<PartnerProfile>(defaultPartnerA)
  const [partnerB, setPartnerB] = useState<PartnerProfile>(defaultPartnerB)
  const [relationship, setRelationship] = useState<RelationshipInfo>(defaultRelationship)

  const handleSubmit = () => {
    onSubmit(partnerA, partnerB, relationship)
  }

  const handleUseDefaults = () => {
    onSubmit(defaultPartnerA, defaultPartnerB, defaultRelationship)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={handleUseDefaults}
          disabled={isCreating}
          className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          {isCreating ? 'Creating...' : 'Create Test Relationship (Use Defaults)'}
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
        >
          {showForm ? 'Hide' : 'Show'} Profile Form
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-700 rounded-lg p-6 space-y-6">
          {/* Partner A */}
          <div>
            <h3 className="text-xl font-bold text-purple-400 mb-4">Partner A Profile</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={partnerA.fullName}
                onChange={(e) => setPartnerA({ ...partnerA, fullName: e.target.value })}
                placeholder="Full Name"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={partnerA.preferredName}
                onChange={(e) => setPartnerA({ ...partnerA, preferredName: e.target.value })}
                placeholder="Preferred Name"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="number"
                value={partnerA.age}
                onChange={(e) => setPartnerA({ ...partnerA, age: parseInt(e.target.value) })}
                placeholder="Age"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={partnerA.pronouns}
                onChange={(e) => setPartnerA({ ...partnerA, pronouns: e.target.value })}
                placeholder="Pronouns"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={partnerA.occupation}
                onChange={(e) => setPartnerA({ ...partnerA, occupation: e.target.value })}
                placeholder="Occupation"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <textarea
                value={partnerA.selfDescription}
                onChange={(e) => setPartnerA({ ...partnerA, selfDescription: e.target.value })}
                placeholder="Self Description"
                rows={3}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <input
                type="text"
                value={partnerA.interests}
                onChange={(e) => setPartnerA({ ...partnerA, interests: e.target.value })}
                placeholder="Interests"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <textarea
                value={partnerA.personality || ''}
                onChange={(e) => setPartnerA({ ...partnerA, personality: e.target.value })}
                placeholder="Personality (e.g., 'introverted, analytical, conflict-avoidant')"
                rows={2}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <textarea
                value={partnerA.hiddenTruth || ''}
                onChange={(e) => setPartnerA({ ...partnerA, hiddenTruth: e.target.value })}
                placeholder="Hidden Truth (optional - secret feelings/thoughts they haven't shared)"
                rows={2}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <select
                value={partnerA.enthusiasmLevel || 'medium'}
                onChange={(e) => setPartnerA({ ...partnerA, enthusiasmLevel: e.target.value as 'low' | 'medium' | 'high' })}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              >
                <option value="low">Enthusiasm: Low</option>
                <option value="medium">Enthusiasm: Medium</option>
                <option value="high">Enthusiasm: High</option>
              </select>
              <input
                type="text"
                value={partnerA.communicationStyle || ''}
                onChange={(e) => setPartnerA({ ...partnerA, communicationStyle: e.target.value })}
                placeholder="Communication Style (e.g., 'direct and logical', 'passive-aggressive')"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
            </div>
          </div>

          {/* Partner B */}
          <div>
            <h3 className="text-xl font-bold text-pink-400 mb-4">Partner B Profile</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                value={partnerB.fullName}
                onChange={(e) => setPartnerB({ ...partnerB, fullName: e.target.value })}
                placeholder="Full Name"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={partnerB.preferredName}
                onChange={(e) => setPartnerB({ ...partnerB, preferredName: e.target.value })}
                placeholder="Preferred Name"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="number"
                value={partnerB.age}
                onChange={(e) => setPartnerB({ ...partnerB, age: parseInt(e.target.value) })}
                placeholder="Age"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={partnerB.pronouns}
                onChange={(e) => setPartnerB({ ...partnerB, pronouns: e.target.value })}
                placeholder="Pronouns"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={partnerB.occupation}
                onChange={(e) => setPartnerB({ ...partnerB, occupation: e.target.value })}
                placeholder="Occupation"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <textarea
                value={partnerB.selfDescription}
                onChange={(e) => setPartnerB({ ...partnerB, selfDescription: e.target.value })}
                placeholder="Self Description"
                rows={3}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <input
                type="text"
                value={partnerB.interests}
                onChange={(e) => setPartnerB({ ...partnerB, interests: e.target.value })}
                placeholder="Interests"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <textarea
                value={partnerB.personality || ''}
                onChange={(e) => setPartnerB({ ...partnerB, personality: e.target.value })}
                placeholder="Personality (e.g., 'introverted, analytical, conflict-avoidant')"
                rows={2}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <textarea
                value={partnerB.hiddenTruth || ''}
                onChange={(e) => setPartnerB({ ...partnerB, hiddenTruth: e.target.value })}
                placeholder="Hidden Truth (optional - secret feelings/thoughts they haven't shared)"
                rows={2}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white col-span-2"
              />
              <select
                value={partnerB.enthusiasmLevel || 'medium'}
                onChange={(e) => setPartnerB({ ...partnerB, enthusiasmLevel: e.target.value as 'low' | 'medium' | 'high' })}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              >
                <option value="low">Enthusiasm: Low</option>
                <option value="medium">Enthusiasm: Medium</option>
                <option value="high">Enthusiasm: High</option>
              </select>
              <input
                type="text"
                value={partnerB.communicationStyle || ''}
                onChange={(e) => setPartnerB({ ...partnerB, communicationStyle: e.target.value })}
                placeholder="Communication Style (e.g., 'direct and logical', 'passive-aggressive')"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
            </div>
          </div>

          {/* Relationship */}
          <div>
            <h3 className="text-xl font-bold text-blue-400 mb-4">Relationship Info</h3>
            <div className="grid grid-cols-1 gap-4">
              <input
                type="number"
                value={relationship.durationMonths}
                onChange={(e) => setRelationship({ ...relationship, durationMonths: parseInt(e.target.value) })}
                placeholder="Duration (months)"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <textarea
                value={relationship.description}
                onChange={(e) => setRelationship({ ...relationship, description: e.target.value })}
                placeholder="Relationship Description"
                rows={3}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <textarea
                value={relationship.goals}
                onChange={(e) => setRelationship({ ...relationship, goals: e.target.value })}
                placeholder="Therapy Goals"
                rows={2}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={relationship.howWeMet}
                onChange={(e) => setRelationship({ ...relationship, howWeMet: e.target.value })}
                placeholder="How We Met"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
              <input
                type="text"
                value={relationship.livingSituation}
                onChange={(e) => setRelationship({ ...relationship, livingSituation: e.target.value })}
                placeholder="Living Situation"
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isCreating}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create Relationship with Custom Profiles'}
          </button>
        </div>
      )}
    </div>
  )
}
