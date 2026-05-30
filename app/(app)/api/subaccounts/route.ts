import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSubaccount } from '@/lib/flutterwave';

export async function GET() {
  try {
    const users = await prisma.supplier.findMany({
      select: {
        id: true,
        businessName: true,
        kycStatus: true,
        flwSubaccountId: true,
        bankCode: true, 
        accountNumber: true,
        user: {
          select: {
            email: true,
            name: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    const supplier = await prisma.supplier.findUnique({
      where: { id: userId },
      include: { user: true }
    });

    if (!supplier || !supplier.bankCode || !supplier.accountNumber) {
      return NextResponse.json(
        { error: 'Supplier details or bank info missing' },
        { status: 400 }
      );
    }

    // Call your Flutterwave integration
    const fwResponse = await createSubaccount({
      account_bank: supplier.bankCode,
      account_number: supplier.accountNumber,
      business_name: supplier.businessName,
      business_email: supplier.user.email,
      business_contact: supplier.user.name || supplier.businessName,
      business_contact_mobile: supplier.phone,
      country: 'NG',
      split_type: 'percentage',
      split_value: 0.9, // Supplier receives 90%, Platform takes 10%
    });

    if (fwResponse) {
      await prisma.supplier.update({
        where: { id: userId },
        data: {
          flwSubaccountId: fwResponse.subaccount_id,
        },
      });

      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Failed to create subaccount' }, { status: 500 });
  } catch (error: any) {
    console.error('Subaccount Retry Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}