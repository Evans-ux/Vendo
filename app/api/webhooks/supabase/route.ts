import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const MAX_RETRIES = 5
const RETRY_DELAY = 1000 // 1 second

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying... ${MAX_RETRIES - retries + 1}/${MAX_RETRIES}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return retryOperation(operation, retries - 1)
    }
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('x-webhook-signature')
    // TODO: Verify signature with your webhook secret
    
    const { type, record } = payload

    if (type === 'INSERT' && record.table === 'auth.users') {
      // User created in Supabase Auth
      const userId = record.id
      const email = record.email
      const fullName = record.raw_user_meta_data?.full_name

      // Insert into users table with retry mechanism
      await retryOperation(async () => {
        await prisma.user.create({
          data: {
            id: userId,
            email: email,
            name: fullName,
            role: 'SUPPLIER',
          },
        })
      })

      console.log(`User created successfully: ${userId}`)
      
      return NextResponse.json({ 
        success: true, 
        message: 'User created in database' 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook received but no action taken' 
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
