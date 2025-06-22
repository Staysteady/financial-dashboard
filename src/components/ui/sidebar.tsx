'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BanknotesIcon,
  ChartBarIcon,
  CreditCardIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  PlusIcon,
  CalendarDaysIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Accounts', href: '/dashboard/accounts', icon: BanknotesIcon },
  { name: 'Transactions', href: '/dashboard/transactions', icon: CreditCardIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  { name: 'Projections', href: '/dashboard/projections', icon: ArrowTrendingUpIcon },
  { name: 'Goals', href: '/dashboard/goals', icon: TrophyIcon },
  { name: 'Budgets', href: '/dashboard/budgets', icon: CalendarDaysIcon },
  { name: 'Reports', href: '/dashboard/reports', icon: DocumentTextIcon },
  { name: 'Alerts', href: '/dashboard/alerts', icon: BellIcon },
];

const secondaryNavigation = [
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
  { name: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
];

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        "relative z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-0 flex">
          <div className="relative mr-16 flex w-full max-w-xs flex-1">
            <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-2 ring-1 ring-white/10">
              <div className="flex h-16 shrink-0 items-center">
                <BanknotesIcon className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">FinDash</span>
              </div>
              <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                  <li>
                    <ul role="list" className="-mx-2 space-y-1">
                      {navigation.map((item) => (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={cn(
                              pathname === item.href
                                ? 'bg-blue-50 text-blue-600'
                                : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                              'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                            )}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <item.icon
                              className={cn(
                                pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600',
                                'h-6 w-6 shrink-0'
                              )}
                            />
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                  <li className="-mx-6 mt-auto">
                    <div className="border-t border-gray-200 px-6 pt-6">
                      <ul role="list" className="-mx-2 space-y-1">
                        {secondaryNavigation.map((item) => (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className={cn(
                                pathname === item.href
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                              )}
                              onClick={() => setSidebarOpen(false)}
                            >
                              <item.icon
                                className={cn(
                                  pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600',
                                  'h-6 w-6 shrink-0'
                                )}
                              />
                              {item.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6">
          <div className="flex h-16 shrink-0 items-center">
            <BanknotesIcon className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">FinDash</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          pathname === item.href
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                          'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                        )}
                      >
                        <item.icon
                          className={cn(
                            pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600',
                            'h-6 w-6 shrink-0'
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                <div className="text-xs font-semibold leading-6 text-gray-400 uppercase tracking-wide">
                  Quick Actions
                </div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  <li>
                    <button className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full text-left">
                      <PlusIcon className="text-gray-400 group-hover:text-blue-600 h-6 w-6 shrink-0" />
                      Add Transaction
                    </button>
                  </li>
                  <li>
                    <button className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full text-left">
                      <CreditCardIcon className="text-gray-400 group-hover:text-blue-600 h-6 w-6 shrink-0" />
                      Connect Bank
                    </button>
                  </li>
                </ul>
              </li>
              <li className="-mx-6 mt-auto">
                <div className="border-t border-gray-200 px-6 pt-6">
                  <ul role="list" className="-mx-2 space-y-1">
                    {secondaryNavigation.map((item) => (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            pathname === item.href
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                          )}
                        >
                          <item.icon
                            className={cn(
                              pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600',
                              'h-6 w-6 shrink-0'
                            )}
                          />
                          {item.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Mobile menu button */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-gray-200 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              {/* Page title will be injected here */}
              <h1 className="text-xl font-semibold text-gray-900">
                Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
              {/* Notifications */}
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">View notifications</span>
                <BellIcon className="h-6 w-6" />
              </button>

              {/* User menu */}
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
              <div className="relative">
                <button
                  type="button"
                  className="-m-1.5 flex items-center p-1.5"
                >
                  <span className="sr-only">Open user menu</span>
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <span className="hidden lg:flex lg:items-center">
                    <span className="ml-4 text-sm font-semibold leading-6 text-gray-900">
                      John Stedman
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}