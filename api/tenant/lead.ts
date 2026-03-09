import { NextRequest, NextResponse } from 'next/server'
import { createLead } from './_lib/lead'

interface LeadPayload {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classInterested: string
  source: string
  status: string
}

export async function POST(request: NextRequest) {
  try {
    const body: LeadPayload = await request.json()
    if (!body.studentName || !body.parentName || !body.contactPhone || !body.contactEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const result = await createLead(body)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in lead API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
