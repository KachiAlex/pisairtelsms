import { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  UserPlus,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const students = [
  {
    id: 'STU001',
    name: 'Adebayo Johnson',
    class: 'JSS 3A',
    gender: 'Male',
    guardian: 'Mrs. Johnson',
    phone: '+234 801 234 5678',
    status: 'Active',
    avatar: '',
  },
  {
    id: 'STU002',
    name: 'Chioma Okafor',
    class: 'SS 2B',
    gender: 'Female',
    guardian: 'Mr. Okafor',
    phone: '+234 802 345 6789',
    status: 'Active',
    avatar: '',
  },
  {
    id: 'STU003',
    name: 'Ibrahim Mohammed',
    class: 'JSS 1C',
    gender: 'Male',
    guardian: 'Mrs. Mohammed',
    phone: '+234 803 456 7890',
    status: 'Active',
    avatar: '',
  },
  {
    id: 'STU004',
    name: 'Blessing Eze',
    class: 'SS 3A',
    gender: 'Female',
    guardian: 'Mr. Eze',
    phone: '+234 804 567 8901',
    status: 'Active',
    avatar: '',
  },
  {
    id: 'STU005',
    name: 'Emeka Nwankwo',
    class: 'JSS 2A',
    gender: 'Male',
    guardian: 'Mrs. Nwankwo',
    phone: '+234 805 678 9012',
    status: 'Active',
    avatar: '',
  },
  {
    id: 'STU006',
    name: 'Fatima Abubakar',
    class: 'SS 1B',
    gender: 'Female',
    guardian: 'Mr. Abubakar',
    phone: '+234 806 789 0123',
    status: 'Suspended',
    avatar: '',
  },
];

const stats = [
  { label: 'Total Students', value: '1,248', color: 'text-blue-600' },
  { label: 'Active', value: '1,195', color: 'text-green-600' },
  { label: 'Graduated', value: '42', color: 'text-purple-600' },
  { label: 'Withdrawn', value: '11', color: 'text-red-600' },
];

export default function StudentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-2">Student Management</h1>
          <p className="text-gray-600">Manage student records, enrollment, and profiles</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Enroll Student
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl ${stat.color}`}>{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Student Records</CardTitle>
              <CardDescription>View and manage all student information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <TabsList>
                <TabsTrigger value="all">All Students</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="suspended">Suspended</TabsTrigger>
                <TabsTrigger value="graduated">Graduated</TabsTrigger>
              </TabsList>

              <div className="flex flex-1 gap-2 sm:max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    <SelectItem value="jss1">JSS 1</SelectItem>
                    <SelectItem value="jss2">JSS 2</SelectItem>
                    <SelectItem value="jss3">JSS 3</SelectItem>
                    <SelectItem value="ss1">SS 1</SelectItem>
                    <SelectItem value="ss2">SS 2</SelectItem>
                    <SelectItem value="ss3">SS 3</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="all" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={student.avatar} />
                              <AvatarFallback>
                                {student.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm">{student.name}</p>
                              <p className="text-xs text-gray-500">{student.gender}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{student.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.class}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{student.guardian}</TableCell>
                        <TableCell className="text-sm">{student.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === 'Active'
                                ? 'default'
                                : student.status === 'Suspended'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                View Records
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Promote/Demote
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">Showing 1-6 of 1,248 students</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="active">
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-gray-500">Active students view</p>
              </div>
            </TabsContent>

            <TabsContent value="suspended">
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-gray-500">Suspended students view</p>
              </div>
            </TabsContent>

            <TabsContent value="graduated">
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed">
                <p className="text-sm text-gray-500">Graduated students view</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
export default StudentManagement;
