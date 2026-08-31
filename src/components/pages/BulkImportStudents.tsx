import React, { useState } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Download, FileText } from 'lucide-react'

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

const sampleCsvData = `Name,Class,Arm,Gender,Guardian,Phone
,,A,Male,,
,,B,Female,,`

export function BulkImportStudents({ open, onClose, onImport, currentStudentCount }: BulkImportStudentsProps) {
  const [parsedData, setParsedData] = useState<Student[]>([])
  const [errors, setErrors] = useState<{row: number, field: string, message: string}[]>([])

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
      { Name: '', Class: '', Arm: 'A', Gender: 'Male', Guardian: '', Phone: '' },
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

  const handleImport = async () => {
    if (errors.length === 0 && parsedData.length > 0) {
      try {
        const { createStudents } = await import('../../lib/studentsClient')
        const payloads = parsedData.map(s => ({
          name: s.name,
          class: s.class,
          arm: s.arm,
          gender: s.gender,
          status: s.status as 'Active' | 'Suspended' | 'Graduated',
          guardian: s.guardian,
          phone: s.phone,
        }))
        await createStudents(payloads)
        onImport(parsedData)
        onClose()
        setParsedData([])
        setErrors([])
      } catch (err) {
        console.error('Import failed:', err)
        setErrors([{ row: 0, field: 'import', message: 'Failed to import students. Please try again.' }])
      }
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-900 mb-3">📋 Format Guide</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-red-700 mb-2">
                  <strong>Required columns:</strong> Name, Class, Arm, Gender, Guardian, Phone
                </p>
                <p className="text-xs text-red-700 mb-2">
                  <strong>Valid classes:</strong> JSS 1, JSS 2, JSS 3, SS 1, SS 2, SS 3
                </p>
                <p className="text-xs text-red-700 mb-2">
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
              </div>
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
