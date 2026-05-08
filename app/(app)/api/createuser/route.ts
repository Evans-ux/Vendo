import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";



export async function POST(request: NextRequest) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({
            error: "Invalid or missing JSON body",
        }, { status: 400 });
    }

    const { email, name } = body;

    if (!email || !name) {
        return NextResponse.json({
            error: "please provide email or name",
        }, { status: 400 });
    }

    try {

        const createUser = await prisma.user.create({
            data: {
                name: name,
                email: email
            }
        })

        if (createUser) {
            return NextResponse.json({
                message: "your  has been  successfully  created",
                status: 200
            }, { status: 200 })
        }

    } catch (err: any) {
        if (err) {
            console.log(err?.message)
            return NextResponse.json({
                message: "something went wrong while creating  your  account"
            }, { status: 500 })
        }
    }

}