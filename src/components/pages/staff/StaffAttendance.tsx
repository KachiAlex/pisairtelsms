import React, { useState } from 'react'
import { QrCode, ScanLine, ClipboardList } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { QrAttendanceDisplay } from './QrAttendanceDisplay'
import { QrAttendanceScanner } from './QrAttendanceScanner'
import { AdminManualAttendance } from './AdminManualAttendance'

function getAuthRole(): string {
  try {
    const auth = JSON.parse(localStorage.getItem('auth') || '{}')
    return auth.role || auth.user?.role || ''
  } catch {
    return ''
  }
}

export function StaffAttendance() {
  const [activeTab, setActiveTab] = useState('admin-manual')
  const role = getAuthRole()
  const isAdmin = role === 'tenant_admin' || role === 'super_admin'

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="admin-manual" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            <span className="hidden sm:inline">Manual</span>
          </TabsTrigger>
          <TabsTrigger value="qr-display" className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR Code</span>
          </TabsTrigger>
          <TabsTrigger value="qr-scan" className="flex items-center gap-2">
            <ScanLine className="w-4 h-4" />
            <span className="hidden sm:inline">Scan</span>
          </TabsTrigger>
        </TabsList>

        {/* Admin Manual Marking */}
        <TabsContent value="admin-manual">
          <AdminManualAttendance />
        </TabsContent>

        {/* QR Code Display (Admin generates) */}
        <TabsContent value="qr-display">
          {isAdmin ? (
            <QrAttendanceDisplay />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Only administrators can generate QR codes for attendance.</p>
            </div>
          )}
        </TabsContent>

        {/* QR Scanner (Staff scans) */}
        <TabsContent value="qr-scan">
          <QrAttendanceScanner />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default StaffAttendance
