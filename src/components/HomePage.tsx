import React from 'react';
import { GraduationCap, BookOpen, BarChart3, DollarSign, FileText, Users, Shield, Sparkles, CheckCircle, ArrowRight, Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface HomePageProps {
  onNavigateToDashboard: () => void;
}

export function HomePage({ onNavigateToDashboard }: HomePageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Student Management',
      description: 'Comprehensive enrollment, promotion, and student record management system.',
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: 'CBT & Examinations',
      description: 'Computer-based testing with live monitoring, question banks, and automated grading.',
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: 'Academic Structure',
      description: 'Manage classes, subjects, teachers, and complete academic configuration.',
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: 'Finance & Fees',
      description: 'Track fee collection, manage invoices, and generate financial reports.',
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: 'Analytics & Reports',
      description: 'Powerful insights into academic performance, attendance, and financial metrics.',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Security & Compliance',
      description: 'Role-based access control, data encryption, and comprehensive audit logs.',
    },
  ];

  const benefits = [
    'Automated result computation and grading',
    'Real-time exam monitoring',
    'Multi-branch campus management',
    'SMS/Email notifications',
    'Biometric attendance integration',
    'Mobile-responsive interface',
    'Offline CBT synchronization',
    'Payment gateway integration',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl text-gray-900">SCHOLIX</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition-colors">
                Features
              </a>
              <a href="#benefits" className="text-gray-700 hover:text-blue-600 transition-colors">
                Benefits
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition-colors">
                Pricing
              </a>
              <a href="#contact" className="text-gray-700 hover:text-blue-600 transition-colors">
                Contact
              </a>
              <Button onClick={onNavigateToDashboard} className="bg-blue-600 hover:bg-blue-700">
                Access Dashboard
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-4 py-3 space-y-3">
              <a href="#features" className="block text-gray-700 hover:text-blue-600 py-2">
                Features
              </a>
              <a href="#benefits" className="block text-gray-700 hover:text-blue-600 py-2">
                Benefits
              </a>
              <a href="#pricing" className="block text-gray-700 hover:text-blue-600 py-2">
                Pricing
              </a>
              <a href="#contact" className="block text-gray-700 hover:text-blue-600 py-2">
                Contact
              </a>
              <Button onClick={onNavigateToDashboard} className="w-full bg-blue-600 hover:bg-blue-700">
                Access Dashboard
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute -bottom-20 left-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-blue-200 text-blue-700 rounded-full text-sm font-medium mb-6 shadow-sm">
                <Sparkles className="w-4 h-4" />
                Complete School Management System
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Transform Your School With{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  SCHOLIX
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
                A comprehensive school management platform designed for modern educational institutions. 
                Streamline operations, enhance academic excellence, and empower your entire school community.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  onClick={onNavigateToDashboard}
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-8 shadow-lg hover:shadow-xl transition-all"
                >
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 border-2 hover:bg-white/50 backdrop-blur-sm">
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span>14-day free trial</span>
                </div>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative lg:h-[600px] flex items-center justify-center">
              {/* Floating Cards */}
              <div className="absolute top-0 left-0 z-10 animate-float">
                <Card className="w-48 shadow-xl border-2 border-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Total Students</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">2,847</p>
                    <p className="text-xs text-green-600 mt-1">↑ 12% this term</p>
                  </CardContent>
                </Card>
              </div>

              <div className="absolute top-20 right-0 z-10 animate-float" style={{ animationDelay: '0.5s' }}>
                <Card className="w-44 shadow-xl border-2 border-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Pass Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">86%</p>
                    <p className="text-xs text-purple-600 mt-1">Excellent!</p>
                  </CardContent>
                </Card>
              </div>

              <div className="absolute bottom-10 left-10 z-10 animate-float" style={{ animationDelay: '1s' }}>
                <Card className="w-40 shadow-xl border-2 border-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Active Exams</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">12</p>
                    <p className="text-xs text-orange-600 mt-1">3 ongoing</p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Dashboard Preview */}
              <div className="relative w-full max-w-md mx-auto">
                <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-white rounded-xl p-6 space-y-4">
                    {/* Dashboard Header */}
                    <div className="flex items-center justify-between pb-4 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">SCHOLIX Dashboard</p>
                          <p className="text-xs text-gray-500">Real-time Overview</p>
                        </div>
                      </div>
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <DollarSign className="w-4 h-4 text-blue-600" />
                          <p className="text-xs text-gray-600">Revenue</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">₦45.2M</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-xs text-gray-600">Attendance</p>
                        </div>
                        <p className="text-lg font-bold text-gray-900">94%</p>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-3">Performance Trend</p>
                      <div className="h-24 flex items-end justify-between gap-1">
                        {[45, 60, 55, 75, 65, 85, 90, 88, 92].map((height, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-gradient-to-t from-blue-600 to-purple-600 rounded-t transition-all hover:opacity-80"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-2">
                      <button className="p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                        <Users className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-700">Students</p>
                      </button>
                      <button className="p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                        <FileText className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-700">Exams</p>
                      </button>
                      <button className="p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                        <BarChart3 className="w-4 h-4 text-green-600 mx-auto mb-1" />
                        <p className="text-xs text-gray-700">Reports</p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl blur-2xl opacity-20 -z-10"></div>
              </div>

              {/* Bottom Right Floating Card */}
              <div className="absolute bottom-0 right-0 z-10 animate-float" style={{ animationDelay: '1.5s' }}>
                <Card className="w-48 shadow-xl border-2 border-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">Collection</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">₦8.5M</p>
                    <p className="text-xs text-blue-600 mt-1">This month</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Add CSS for animations */}
        <style>{`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-20px);
            }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Schools
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage your school efficiently in one comprehensive platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-2 hover:border-blue-500 transition-all hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 text-blue-600">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                Why Schools Choose SCHOLIX
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Join hundreds of schools that have transformed their operations with our comprehensive platform.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-gray-700">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-blue-50 border-none">
                <CardContent className="p-6">
                  <p className="text-4xl font-bold text-blue-600 mb-2">99.9%</p>
                  <p className="text-gray-700">Uptime Guarantee</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-none">
                <CardContent className="p-6">
                  <p className="text-4xl font-bold text-green-600 mb-2">500+</p>
                  <p className="text-gray-700">Schools Nationwide</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-none">
                <CardContent className="p-6">
                  <p className="text-4xl font-bold text-purple-600 mb-2">24/7</p>
                  <p className="text-gray-700">Support Available</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-none">
                <CardContent className="p-6">
                  <p className="text-4xl font-bold text-orange-600 mb-2">100K+</p>
                  <p className="text-gray-700">Active Students</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Transform Your School?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of educators who trust SCHOLIX for their school management needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onNavigateToDashboard}
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-white text-white hover:bg-white/10">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl text-white">SCHOLIX</span>
              </div>
              <p className="text-sm text-gray-400">
                Empowering educational institutions with comprehensive school management solutions.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2026 SCHOLIX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
