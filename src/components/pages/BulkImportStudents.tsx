import React, { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Download, FileText, Eye } from 'lucide-react'

interface Student {
  id: string
  admissionNo: string
  name: string
  class: string
  arm: string
  gender: string
  status: 'Active' | 'Suspended' | 'Graduated'
  guardian: string
  phone: string
}

interface BulkImportStudentsProps {
  open: boolean
  onClose: () => void
  onImport: (students: Student[]) => void
  currentStudentCount: number
}

// Sample data for demonstration
const sampleCsvData = `Name,Class,Arm,Gender,Guardian,Phone
John Doe,JSS 1,A,Male,Jane Doe,+1234567890
Jane Smith,JSS 2,B,Female,Bob Smith,+1234567891
Michael Johnson,JSS 3,C,Male,Sarah Johnson,+1234567892
Emily Davis,SS 1,A,Female,Robert Davis,+1234567893
David Wilson,SS 2,B,Male,Mary Wilson,+1234567894
Lisa Brown,SS 3,C,Female,James Brown,+1234567895`

const sampleStudents: Student[] = [
  {
    id: '1',
    admissionNo: 'SCH/2024/001',
    name: 'John Doe',
    class: 'JSS 1',
    arm: 'A',
    gender: 'Male',
    status: 'Active',
    guardian: 'Jane Doe',
    phone: '+1234567890',
  },
  {
    id: '2',
    admissionNo: 'SCH/2024/002',
    name: 'Jane Smith',
    class: 'JSS 2',
    arm: 'B',
    gender: 'Female',
    status: 'Active',
    guardian: 'Bob Smith',
    phone: '+1234567891',
  },
  {
    id: '3',
    admissionNo: 'SCH/2024/003',
    name: 'Michael Johnson',
    class: 'JSS 3',
    arm: 'C',
    gender: 'Male',
    status: 'Active',
    guardian: 'Sarah Johnson',
    phone: '+1234567892',
  },
  {
    id: '4',
    admissionNo: 'SCH/2024/004',
    name: 'Emily Davis',
    class: 'SS 1',
    arm: 'A',
    gender: 'Female',
    status: 'Active',
    guardian: 'Robert Davis',
    phone: '+1234567893',
  },
  {
    id: '5',
    admissionNo: 'SCH/2024/005',
    name: 'David Wilson',
    class: 'SS 2',
    arm: 'B',
    gender: 'Male',
    status: 'Active',
    guardian: 'Mary Wilson',
    phone: '+1234567894',
  },
  {
    id: '6',
    admissionNo: 'SCH/2024/006',
    name: 'Lisa Brown',
    class: 'SS 3',
    arm: 'C',
    gender: 'Female',
    status: 'Active',
    guardian: 'James Brown',
    phone: '+1234567895',
  },
]

export function BulkImportStudents({ open, onClose, onImport, currentStudentCount }: BulkImportStudentsProps) {
  const [parsedData, setParsedData] = useState<Student[]>([])
  const [errors, setErrors] = useState<{row: number, field: string, message: string}[]>([])
  const [showSample, setShowSample] = useState(false)

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'sample_students.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadSampleExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Name: 'John Doe', Class: 'JSS 1', Arm: 'A', Gender: 'Male', Guardian: 'Jane Doe', Phone: '+1234567890' },
      { Name: 'Jane Smith', Class: 'JSS 2', Arm: 'B', Gender: 'Female', Guardian: 'Bob Smith', Phone: '+1234567891' },
      { Name: 'Michael Johnson', Class: 'JSS 3', Arm: 'C', Gender: 'Male', Guardian: 'Sarah Johnson', Phone: '+1234567892' },
      { Name: 'Emily Davis', Class: 'SS 1', Arm: 'A', Gender: 'Female', Guardian: 'Robert Davis', Phone: '+1234567893' },
      { Name: 'David Wilson', Class: 'SS 2', Arm: 'B', Gender: 'Male', Guardian: 'Mary Wilson', Phone: '+1234567894' },
      { Name: 'Lisa Brown', Class: 'SS 3', Arm: 'C', Gender: 'Female', Guardian: 'James Brown', Phone: '+1234567895' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students')
    XLSX.writeFile(wb, 'sample_students.xlsx')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    parseFile(selectedFile)
  }

  const parseFile = (file: File) => {
    const fileType = file.name.split('.').pop()?.toLowerCase()
    if (fileType === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const data = results.data as any[]
            const parsed = data
              .filter(row => Object.values(row).some(value => value))
              .map((row, index) => {
              const student: Student = {
                id: (currentStudentCount + index + 1).toString(),
                admissionNo: `SCH/2024/${String(currentStudentCount + index + 1).padStart(3, '0')}`,
                name: row['Name'] || row['name'] || '',
                class: row['Class'] || row['class'] || '',
                arm: row['Arm'] || row['arm'] || 'A',
                gender: row['Gender'] || row['gender'] || '',
                status: 'Active',
                guardian: row['Guardian'] || row['guardian'] || '',
                phone: row['Phone'] || row['phone'] || '',
              }
              return student
            })
            setParsedData(parsed)
            validateData(parsed)
          } catch (error) {
            console.error('Error parsing CSV:', error)
            setErrors([{ row: 0, field: 'file', message: 'Failed to parse CSV file' }])
          }
        },
        error: (error) => {
          console.error('Papa Parse error:', error)
          setErrors([{ row: 0, field: 'file', message: 'Error reading CSV file' }])
        }
      })
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          const headers = jsonData[0] as string[]
          const rows = jsonData.slice(1) as any[][]
          const parsed = rows
            .filter(row => row.some(cell => cell))
            .map((row, index) => {
            const obj: any = {}
            headers.forEach((h, i) => obj[h] = row[i] || '')
            const student: Student = {
              id: (currentStudentCount + index + 1).toString(),
              admissionNo: `SCH/2024/${String(currentStudentCount + index + 1).padStart(3, '0')}`,
              name: obj['Name'] || obj['name'] || '',
              class: obj['Class'] || obj['class'] || '',
              arm: obj['Arm'] || obj['arm'] || 'A',
              gender: obj['Gender'] || obj['gender'] || '',
              status: 'Active',
              guardian: obj['Guardian'] || obj['guardian'] || '',
              phone: obj['Phone'] || obj['phone'] || '',
            }
            return student
          })
          setParsedData(parsed)
          validateData(parsed)
        } catch (error) {
          console.error('Error parsing Excel:', error)
          setErrors([{ row: 0, field: 'file', message: 'Failed to parse Excel file' }])
        }
      }
      reader.onerror = () => {
        setErrors([{ row: 0, field: 'file', message: 'Error reading file' }])
      }
      reader.readAsArrayBuffer(file)
    } else {
      setErrors([{ row: 0, field: 'file', message: 'Unsupported file type. Please use CSV or Excel files.' }])
    }
  }

  const validateData = (data: Student[]) => {
    const errs: {row: number, field: string, message: string}[] = []
    data.forEach((student, index) => {
      if (!student.name.trim()) errs.push({ row: index + 1, field: 'name', message: 'Required' })
      if (!student.class.trim()) errs.push({ row: index + 1, field: 'class', message: 'Required' })
      if (!student.gender.trim()) errs.push({ row: index + 1, field: 'gender', message: 'Required' })
      if (!student.guardian.trim()) errs.push({ row: index + 1, field: 'guardian', message: 'Required' })
      if (!student.phone.trim()) errs.push({ row: index + 1, field: 'phone', message: 'Required' })
      if (!['Male', 'Female'].includes(student.gender)) errs.push({ row: index + 1, field: 'gender', message: 'Must be Male or Female' })
      if (!['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3'].includes(student.class)) errs.push({ row: index + 1, field: 'class', message: 'Invalid class' })
    })
    setErrors(errs)
  }

  const handleImport = () => {
    if (errors.length === 0 && parsedData.length > 0) {
      onImport(parsedData)
      onClose()
      setParsedData([])
      setErrors([])
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to add multiple students at once. Use the sample files below to understand the required format.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Sample Data Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">📋 Sample Data & Format Guide</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-blue-700 mb-2">
                  <strong>Required columns:</strong> Name, Class, Arm, Gender, Guardian, Phone
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  <strong>Valid classes:</strong> JSS 1, JSS 2, JSS 3, SS 1, SS 2, SS 3
                </p>
                <p className="text-xs text-blue-700 mb-2">
                  <strong>Valid genders:</strong> Male, Female
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={downloadSampleCsv}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
                <Button variant="outline" size="sm" onClick={downloadSampleExcel}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSample(!showSample)}>
                  <Eye className="w-4 h-4 mr-2" />
                  {showSample ? 'Hide' : 'Show'} Sample Data
                </Button>
              </div>
              {showSample && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-blue-900 mb-2">Sample Data Preview:</h4>
                  <div className="bg-white border border-blue-200 rounded overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Name</TableHead>
                          <TableHead className="text-xs">Class</TableHead>
                          <TableHead className="text-xs">Arm</TableHead>
                          <TableHead className="text-xs">Gender</TableHead>
                          <TableHead className="text-xs">Guardian</TableHead>
                          <TableHead className="text-xs">Phone</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sampleStudents.slice(0, 3).map((student, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-xs">{student.name}</TableCell>
                            <TableCell className="text-xs">{student.class}</TableCell>
                            <TableCell className="text-xs">{student.arm}</TableCell>
                            <TableCell className="text-xs">{student.gender}</TableCell>
                            <TableCell className="text-xs">{student.guardian}</TableCell>
                            <TableCell className="text-xs">{student.phone}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">Showing first 3 rows of 6 total sample students</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Upload CSV or Excel File</Label>
            <Input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
            <p className="text-xs text-gray-500 mt-1">
              Supported formats: CSV (.csv) and Excel (.xlsx, .xls)
            </p>
          </div>
          {parsedData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Preview ({parsedData.length} students)</h3>
              <div className="max-h-60 overflow-y-auto border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Arm</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((student, index) => (
                      <TableRow key={index} className={errors.some(e => e.row === index + 1) ? 'bg-red-50' : ''}>
                        <TableCell>{student.admissionNo}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.class}</TableCell>
                        <TableCell>{student.arm}</TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>{student.guardian}</TableCell>
                        <TableCell>{student.phone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {errors.length > 0 && (
                <div className="text-red-600 text-sm">
                  <p>Errors found:</p>
                  <ul className="list-disc list-inside">
                    {errors.map((e, i) => <li key={i}>Row {e.row}: {e.field} - {e.message}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleImport} disabled={parsedData.length === 0 || errors.length > 0}>
              Import {parsedData.length} Students
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
