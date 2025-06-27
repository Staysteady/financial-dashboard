'use client';

import { useState } from 'react';
import {
  UserCircleIcon,
  PencilIcon,
  CameraIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  dateOfBirth: string;
  occupation: string;
  company: string;
  bio: string;
  avatar?: string;
}

const mockProfile: UserProfile = {
  firstName: 'John',
  lastName: 'Stedman',
  email: 'john.stedman@example.com',
  phone: '+44 7700 900123',
  address: '123 Financial Street',
  city: 'London',
  country: 'United Kingdom',
  dateOfBirth: '1985-06-15',
  occupation: 'Software Engineer',
  company: 'Tech Solutions Ltd',
  bio: 'Passionate about financial technology and building tools that help people manage their money better.'
};

function ProfileHeader({ profile }: { profile: UserProfile }) {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
      <div className="flex items-center space-x-6">
        <div className="relative">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            {profile.avatar ? (
              <img 
                src={profile.avatar} 
                alt="Profile" 
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-16 h-16 text-white" />
            )}
          </div>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors">
            <CameraIcon className="w-4 h-4 text-white" />
          </button>
        </div>
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile.firstName} {profile.lastName}</h1>
          <p className="text-blue-100 mt-1">{profile.occupation} at {profile.company}</p>
          <p className="text-blue-100 text-sm mt-2">{profile.bio}</p>
          
          <div className="flex items-center space-x-4 mt-4">
            <div className="flex items-center space-x-1 text-blue-100">
              <EnvelopeIcon className="w-4 h-4" />
              <span className="text-sm">{profile.email}</span>
            </div>
            <div className="flex items-center space-x-1 text-blue-100">
              <MapPinIcon className="w-4 h-4" />
              <span className="text-sm">{profile.city}, {profile.country}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonalInformation({ profile }: { profile: UserProfile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);

  const handleSave = () => {
    // Here you would typically save to your backend
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
          <span>{isEditing ? 'Cancel' : 'Edit'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-gray-900">{profile.firstName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          ) : (
            <p className="text-gray-900">{profile.lastName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <div className="flex items-center space-x-2">
            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{profile.email}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <div className="flex items-center space-x-2">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            {isEditing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{profile.phone}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
            {isEditing ? (
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{new Date(profile.dateOfBirth).toLocaleDateString('en-GB')}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
          <div className="flex items-center space-x-2">
            <BriefcaseIcon className="w-4 h-4 text-gray-400" />
            {isEditing ? (
              <input
                type="text"
                value={formData.occupation}
                onChange={(e) => setFormData({...formData, occupation: e.target.value})}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              <p className="text-gray-900">{profile.occupation}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Street Address"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Country"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        ) : (
          <div className="flex items-start space-x-2">
            <MapPinIcon className="w-4 h-4 text-gray-400 mt-1" />
            <div>
              <p className="text-gray-900">{profile.address}</p>
              <p className="text-gray-900">{profile.city}, {profile.country}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        {isEditing ? (
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value})}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell us about yourself..."
          />
        ) : (
          <p className="text-gray-900">{profile.bio}</p>
        )}
      </div>

      {isEditing && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SecuritySection() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <ShieldCheckIcon className="w-5 h-5 text-green-600" />
        <h2 className="text-lg font-semibold text-gray-900">Security</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-green-900">Two-Factor Authentication</h3>
            <p className="text-sm text-green-700">Your account is protected with 2FA</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-700">Enabled</span>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Password</h3>
            <p className="text-sm text-gray-600">Last changed 3 months ago</p>
          </div>
          <button className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            Change Password
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Login Sessions</h3>
            <p className="text-sm text-gray-600">Manage your active sessions</p>
          </div>
          <button className="px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            View Sessions
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <ProfileHeader profile={mockProfile} />

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PersonalInformation profile={mockProfile} />
        </div>
        
        <div className="lg:col-span-1">
          <SecuritySection />
        </div>
      </div>
    </div>
  );
}
