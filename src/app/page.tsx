import Link from "next/link";
import {
  BanknotesIcon,
  ChartBarIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BanknotesIcon className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
            </div>
            <nav className="flex space-x-4">
              <Link
                href="/dashboard"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Take Control of Your Financial Future
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive financial monitoring and analysis dashboard that provides real-time insights
            into your banking and investment activities, with advanced projections to help you plan
            for the future.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <CreditCardIcon className="h-8 w-8 text-blue-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Multi-Bank Integration</h3>
            </div>
            <p className="text-gray-600">
              Connect to multiple financial institutions including Atom Bank, Zopa, Tandem,
              Moneybox, Hargreaves Lansdown, and more.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Real-Time Analytics</h3>
            </div>
            <p className="text-gray-600">
              Track spending patterns, categorize transactions, and get detailed insights
              into your financial habits with interactive charts.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <ArrowTrendingUpIcon className="h-8 w-8 text-purple-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Cash Flow Projections</h3>
            </div>
            <p className="text-gray-600">
              Advanced forecasting to determine how long your savings will last and
              plan for different income scenarios.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <ClockIcon className="h-8 w-8 text-orange-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Financial Runway</h3>
            </div>
            <p className="text-gray-600">
              Calculate exactly how long you can sustain yourself while building
              new business ventures with minimal income.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <ShieldCheckIcon className="h-8 w-8 text-red-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Secure & Private</h3>
            </div>
            <p className="text-gray-600">
              Bank-level encryption for all sensitive financial data with secure
              API connections and privacy-first design.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center mb-4">
              <BanknotesIcon className="h-8 w-8 text-indigo-600 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900">Smart Alerts</h3>
            </div>
            <p className="text-gray-600">
              Get notified when projected funds fall below thresholds or when
              spending patterns change significantly.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Take Control of Your Finances?
          </h3>
          <p className="text-gray-600 mb-6">
            Start monitoring your financial health and planning for your future today.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Launch Dashboard
            <ArrowTrendingUpIcon className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 Financial Dashboard. Built for comprehensive financial monitoring and analysis.</p>
        </div>
      </footer>
    </div>
  );
}
